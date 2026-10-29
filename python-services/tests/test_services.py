import os
import shutil
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.report import ReportItem, LocationSchema, SearchRequest
from app.services.document_builder import build_searchable_document, normalize_text
from app.services.geo_service import (
    calculate_haversine_distance_km,
    calculate_geo_proximity_weight,
    compute_bounding_box,
)
from app.services.chroma_service import ChromaService

client = TestClient(app)
AUTH_HEADER = {"X-Internal-API-Key": "jansetu-internal-secret-2026"}

def test_document_builder_excludes_sensitive_and_operational_fields():
    report = ReportItem(
        id="test_001",
        category="Public Infrastructure",
        subcategory="Streetlights",
        issueType="Broken bulb and wire fault",
        problemDescription="The streetlight in front of the main college gate has ceased functioning.",
        location=LocationSchema(address="Knowledge Park II, Greater Noida", latitude=28.4682, longitude=77.5180),
        applicationStatus="In Progress",
        affectedPeople="5000 students",
        riskOrUrgency="High",
        serviceOrScheme="Greater Noida Electrical Cell",
        impact="Pedestrians unable to walk safely after sunset",
        desiredResolution="Replace lamp fixture and fix cabling",
    )
    
    doc = build_searchable_document(report)
    assert "Infrastructure Type: Streetlights" in doc
    assert "Specific Defect: Broken bulb and wire fault" in doc
    assert "The streetlight in front of the main college gate" in doc
    assert "Knowledge Park II, Greater Noida" in doc
    # Strict exclusion check:
    assert "5000 students" not in doc
    assert "In Progress" not in doc
    assert "High" not in doc

def test_geo_distance_and_validations():
    # Knowledge Park II (28.4682, 77.5180) to Pari Chowk (28.4688, 77.5175) is approx 0.08 - 0.15 km
    dist = calculate_haversine_distance_km(28.4682, 77.5180, 28.4688, 77.5175)
    assert dist is not None
    assert 0.05 < dist < 0.3

    # Distant points: Greater Noida to Noida Sector 62 (~22 km)
    dist_far = calculate_haversine_distance_km(28.4682, 77.5180, 28.6250, 77.3730)
    assert dist_far is not None
    assert 18.0 < dist_far < 28.0

    # Invalid coordinates
    assert calculate_haversine_distance_km(None, 77.5, 28.4, 77.5) is None
    assert calculate_haversine_distance_km(95.0, 77.5, 28.4, 77.5) is None  # Lat > 90
    assert calculate_haversine_distance_km(28.4, 185.0, 28.4, 77.5) is None  # Lon > 180

    # Proximity weight
    assert calculate_geo_proximity_weight(0.1, 10.0) == 1.0
    assert calculate_geo_proximity_weight(12.0, 10.0) == 0.0
    assert 0.4 < calculate_geo_proximity_weight(5.0, 10.0) < 0.6

def test_fastapi_health_endpoint():
    res = client.get("/internal/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "collection_name" in data

def test_fastapi_unauthorized_access():
    res = client.post("/internal/v1/reports/index", json={"reports": []})
    assert res.status_code == 401

def test_chroma_indexing_and_deduplication(tmp_path):
    test_db_dir = str(tmp_path / "test_chroma")
    
    # Custom instance for test isolation
    import chromadb
    from app.services.embedding_service import embedding_service
    test_client = chromadb.PersistentClient(path=test_db_dir)
    test_coll = test_client.get_or_create_collection(
        name="test_reports",
        embedding_function=embedding_service.get_embedding_function()
    )

    from app.services.chroma_service import ChromaService
    svc = ChromaService()
    svc.client = test_client
    svc.collection = test_coll

    report1 = ReportItem(
        id="test_mongo_001",
        source="mongodb",
        category="Public Infrastructure",
        subcategory="Streetlights",
        issueType="Broken light",
        problemDescription="Dark street due to non-functioning streetlight near college gate",
        location=LocationSchema(address="Knowledge Park II", latitude=28.4682, longitude=77.5180),
    )

    # 1. First index -> 1 inserted
    res1 = svc.index_reports([report1])
    assert res1.success is True
    assert res1.inserted == 1
    assert res1.updated == 0

    # 2. Idempotent re-index -> 1 updated, 0 inserted (NO duplicate vector records!)
    res2 = svc.index_reports([report1])
    assert res2.success is True
    assert res2.inserted == 0
    assert res2.updated == 1
    assert svc.collection.count() == 1

def test_semantic_matching_and_spatial_separation(tmp_path):
    test_db_dir = str(tmp_path / "test_chroma_search")
    import chromadb
    from app.services.embedding_service import embedding_service
    test_client = chromadb.PersistentClient(path=test_db_dir)
    test_coll = test_client.get_or_create_collection(
        name="test_search",
        embedding_function=embedding_service.get_embedding_function()
    )

    from app.services.chroma_service import ChromaService
    svc = ChromaService()
    svc.client = test_client
    svc.collection = test_coll

    # Report A: Streetlight broken at Knowledge Park II
    report_a = ReportItem(
        id="rep_light_kp2",
        source="mongodb",
        category="Public Infrastructure",
        subcategory="Streetlights",
        issueType="Broken streetlight fixture",
        problemDescription="The streetlight near the college entrance has stopped working, completely dark.",
        location=LocationSchema(address="Knowledge Park II, Greater Noida", latitude=28.4682, longitude=77.5180),
    )

    # Report B: Deep pothole at Knowledge Park II (same location, different infrastructure category defect)
    report_b = ReportItem(
        id="rep_pothole_kp2",
        source="mongodb",
        category="Public Infrastructure",
        subcategory="Roads and potholes",
        issueType="Deep asphalt pothole",
        problemDescription="Deep pothole in the middle of the road causing two-wheeler accidents.",
        location=LocationSchema(address="Knowledge Park II, Greater Noida", latitude=28.4682, longitude=77.5180),
    )

    # Report C: Streetlight broken at far location (Sector 62, Noida - ~22 km away)
    report_c = ReportItem(
        id="rep_light_far",
        source="mongodb",
        category="Public Infrastructure",
        subcategory="Streetlights",
        issueType="Broken streetlight fixture",
        problemDescription="Dark street because streetlight is not working outside the college gate.",
        location=LocationSchema(address="Sector 62, Noida", latitude=28.6250, longitude=77.3730),
    )

    svc.index_reports([report_a, report_b, report_c])

    # Query: Citizen reports "It is dark outside the college gate because the streetlamp is broken" at Knowledge Park II (0.1 km away)
    query = SearchRequest(
        category="Public Infrastructure",
        subcategory="Streetlights",
        problemDescription="It is dark outside the college gate because the streetlamp is broken.",
        location=LocationSchema(latitude=28.4684, longitude=77.5182),
        radius_km=10.0,
        threshold=0.40,
    )

    search_res = svc.search_similar(query)
    assert search_res.success is True
    assert len(search_res.candidates) > 0

    top_match = search_res.candidates[0]
    # Report A should be top match
    assert top_match.report_id == "rep_light_kp2"
    assert top_match.distance_km is not None and top_match.distance_km < 1.0
    assert top_match.combined_score >= 0.40

    # Report C should NOT be present in candidate list because distance (~22 km) exceeds radius (10 km)
    matched_ids = [c.report_id for c in search_res.candidates]
    assert "rep_light_far" not in matched_ids
