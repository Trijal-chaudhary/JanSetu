import os
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import settings
from app.schemas.report import (
    ReportItem,
    BatchIndexResponse,
    SearchRequest,
    SearchResponse,
    CandidateMatch,
    RemoveReportResponse,
    HealthResponse,
)
from app.services.document_builder import build_searchable_document, normalize_text
from app.services.embedding_service import embedding_service
from app.services.geo_service import (
    calculate_haversine_distance_km,
    calculate_geo_proximity_weight,
)

class ChromaService:
    def __init__(self):
        # Ensure persistence directory exists
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        
        self.client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        
        # Collection using cosine distance space
        self.collection = self.client.get_or_create_collection(
            name=settings.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
            embedding_function=embedding_service.get_embedding_function()
        )

    def index_reports(self, reports: List[ReportItem]) -> BatchIndexResponse:
        processed = 0
        inserted = 0
        updated = 0
        skipped = 0
        failed = 0
        errors = []

        if not reports:
            return BatchIndexResponse(
                success=True,
                processed=0,
                inserted=0,
                updated=0,
                skipped=0,
                failed=0,
                errors=[],
            )

        # Retrieve existing IDs in Chroma to accurately distinguish inserts vs updates
        ids_to_check = [r.id for r in reports if r.id]
        existing_ids = set()
        if ids_to_check:
            try:
                existing_records = self.collection.get(ids=ids_to_check)
                if existing_records and "ids" in existing_records:
                    existing_ids = set(existing_records["ids"])
            except Exception as e:
                # If error checking, continue with upsert
                pass

        documents = []
        metadatas = []
        ids = []

        for report in reports:
            processed += 1
            if not report.id or not str(report.id).strip():
                skipped += 1
                errors.append(f"Report at index {processed - 1} missing valid ID; skipped.")
                continue

            doc_text = build_searchable_document(report)
            if not doc_text or not doc_text.strip():
                skipped += 1
                errors.append(f"Report {report.id} produced empty searchable text; skipped.")
                continue

            # Validate coordinates explicitly
            has_valid_location = 0
            lat_val = -999.0
            lon_val = -999.0
            if (
                report.location
                and report.location.latitude is not None
                and report.location.longitude is not None
            ):
                try:
                    lat_f = float(report.location.latitude)
                    lon_f = float(report.location.longitude)
                    if -90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0:
                        lat_val = lat_f
                        lon_val = lon_f
                        has_valid_location = 1
                except (ValueError, TypeError):
                    has_valid_location = 0

            # Only store supported scalar metadata
            meta = {
                "report_id": str(report.id),
                "source": str(report.source or "mongodb"),
                "category": str(report.category or ""),
                "subcategory": str(report.subcategory or ""),
                "issue_type": str(report.issueType or ""),
                "latitude": float(lat_val),
                "longitude": float(lon_val),
                "has_valid_location": int(has_valid_location),
                "application_status": str(report.applicationStatus or "Reported"),
                "updated_at": str(report.updatedAt or report.createdAt or ""),
            }

            ids.append(str(report.id))
            documents.append(doc_text)
            metadatas.append(meta)

            if str(report.id) in existing_ids:
                updated += 1
            else:
                inserted += 1

        if ids:
            try:
                self.collection.upsert(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas,
                )
            except Exception as err:
                failed += len(ids)
                inserted = 0
                updated = 0
                errors.append(f"ChromaDB upsert failure: {str(err)}")
                return BatchIndexResponse(
                    success=False,
                    processed=processed,
                    inserted=0,
                    updated=0,
                    skipped=skipped,
                    failed=failed,
                    errors=errors,
                )

        return BatchIndexResponse(
            success=True,
            processed=processed,
            inserted=inserted,
            updated=updated,
            skipped=skipped,
            failed=failed,
            errors=errors,
        )

    def search_similar(self, query: SearchRequest) -> SearchResponse:
        # Build query document consistent with historical report indexing
        query_item = ReportItem(
            id="query_temp",
            category=query.category,
            subcategory=query.subcategory,
            problemDescription=query.problemDescription,
            issueType=query.issueType,
            location=query.location,
        )
        query_text = build_searchable_document(query_item)
        if not query_text.strip():
            return SearchResponse(success=True, total_candidates=0, candidates=[])

        # Filter by category if specified (initially Public Infrastructure)
        where_filter = {}
        if query.category:
            where_filter["category"] = query.category

        # Fetch extra candidates to account for geo and eligibility filtering
        fetch_limit = max((query.limit or 5) * 6, 20)
        
        try:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=fetch_limit,
                where=where_filter if where_filter else None,
                include=["metadatas", "distances", "documents"],
            )
        except Exception as err:
            return SearchResponse(success=False, total_candidates=0, candidates=[])

        if not results or not results["ids"] or not results["ids"][0]:
            return SearchResponse(success=True, total_candidates=0, candidates=[])

        ids_list = results["ids"][0]
        distances_list = results["distances"][0] if results.get("distances") else []
        metadatas_list = results["metadatas"][0] if results.get("metadatas") else []
        docs_list = results["documents"][0] if results.get("documents") else []

        candidates: List[CandidateMatch] = []
        max_radius = query.radius_km if (query.radius_km and query.radius_km > 0) else settings.DEFAULT_SEARCH_RADIUS_KM
        threshold = query.threshold if query.threshold is not None else settings.DEFAULT_CONFIDENCE_THRESHOLD

        q_lat = query.location.latitude if (query.location and query.location.latitude is not None) else None
        q_lon = query.location.longitude if (query.location and query.location.longitude is not None) else None

        for idx, report_id in enumerate(ids_list):
            meta = metadatas_list[idx] if idx < len(metadatas_list) else {}
            dist = distances_list[idx] if idx < len(distances_list) else 1.0

            # Cosine distance to similarity score
            # In Chroma, cosine distance d is in [0, 2]. Similarity s = 1.0 - d
            similarity = max(0.0, min(1.0, 1.0 - dist))

            # Eligibility pre-filter: Skip records marked as Resolved or Rejected in snapshot
            status = meta.get("application_status", "Reported")
            if status in ["Resolved", "Rejected"]:
                continue

            # Calculate physical distance
            cand_lat = meta.get("latitude")
            cand_lon = meta.get("longitude")
            has_valid_loc = meta.get("has_valid_location", 0) == 1

            distance_km = None
            if q_lat is not None and q_lon is not None and has_valid_loc and cand_lat != -999.0 and cand_lon != -999.0:
                distance_km = calculate_haversine_distance_km(q_lat, q_lon, cand_lat, cand_lon)

            # Geographic filtering rule:
            # If both coordinates exist, candidate MUST be within search radius
            if distance_km is not None:
                if distance_km > max_radius:
                    continue
                geo_weight = calculate_geo_proximity_weight(distance_km, max_radius)
            else:
                # If either report lacks valid GPS coordinates, do not falsely claim proximity
                geo_weight = 0.0

            # Subcategory alignment factor
            subcat_match = 1.0
            if query.subcategory and meta.get("subcategory"):
                if query.subcategory.lower() != meta.get("subcategory", "").lower():
                    subcat_match = 0.85  # Moderate penalty for cross-subcategory match

            # Combined transparent score
            if distance_km is not None:
                # 65% semantic similarity + 35% geographic proximity, scaled by subcategory match
                raw_combined = (0.65 * similarity + 0.35 * geo_weight) * subcat_match
            else:
                # Without verified geo proximity, penalize combined score to prevent unverified matches
                raw_combined = (similarity * 0.70) * subcat_match

            combined_score = round(min(1.0, max(0.0, raw_combined)), 3)

            # Threshold check
            if combined_score < threshold:
                continue

            candidates.append(
                CandidateMatch(
                    report_id=str(report_id),
                    source=meta.get("source", "mongodb"),
                    category=meta.get("category"),
                    subcategory=meta.get("subcategory"),
                    issue_type=meta.get("issue_type"),
                    distance_km=distance_km,
                    similarity_score=round(similarity, 3),
                    combined_score=combined_score,
                    metadata=meta,
                )
            )

        # Sort candidates descending by combined_score
        candidates.sort(key=lambda c: c.combined_score, reverse=True)

        final_candidates = candidates[: query.limit or 5]
        return SearchResponse(
            success=True,
            total_candidates=len(final_candidates),
            candidates=final_candidates,
        )

    def remove_report(self, report_id: str) -> RemoveReportResponse:
        try:
            self.collection.delete(ids=[str(report_id)])
            return RemoveReportResponse(
                success=True,
                report_id=str(report_id),
                message="Vector record successfully removed.",
            )
        except Exception as err:
            return RemoveReportResponse(
                success=False,
                report_id=str(report_id),
                message=f"Failed to remove vector record: {str(err)}",
            )

    def get_health(self) -> HealthResponse:
        try:
            count = self.collection.count()
            return HealthResponse(
                status="healthy",
                chroma_available=True,
                collection_name=settings.COLLECTION_NAME,
                total_documents=count,
                version=settings.APP_VERSION,
            )
        except Exception:
            return HealthResponse(
                status="degraded",
                chroma_available=False,
                collection_name=settings.COLLECTION_NAME,
                total_documents=0,
                version=settings.APP_VERSION,
            )

chroma_service = ChromaService()
