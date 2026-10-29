from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class LocationSchema(BaseModel):
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ReportItem(BaseModel):
    id: str = Field(..., description="Canonical ID of the report (MongoDB ObjectId or unique JSON ID)")
    source: str = Field("mongodb", description="Record provenance: 'mongodb' or 'json_dataset'")
    category: Optional[str] = None
    subcategory: Optional[str] = None
    problemDescription: Optional[str] = None
    location: Optional[LocationSchema] = None
    issueType: Optional[str] = None
    serviceOrScheme: Optional[str] = None
    relevantDateOrDuration: Optional[str] = None
    applicationStatus: Optional[str] = "Reported"
    impact: Optional[str] = None
    desiredResolution: Optional[str] = None
    affectedPeople: Optional[str] = None
    riskOrUrgency: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class BatchIndexRequest(BaseModel):
    reports: List[ReportItem]

class BatchIndexResponse(BaseModel):
    success: bool
    processed: int
    inserted: int
    updated: int
    skipped: int
    failed: int
    errors: List[str] = []

class SearchRequest(BaseModel):
    category: str = "Public Infrastructure"
    subcategory: Optional[str] = None
    problemDescription: str
    issueType: Optional[str] = None
    location: Optional[LocationSchema] = None
    radius_km: Optional[float] = 10.0
    limit: Optional[int] = 5
    threshold: Optional[float] = 0.40

class CandidateMatch(BaseModel):
    report_id: str
    source: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    issue_type: Optional[str] = None
    distance_km: Optional[float] = None
    similarity_score: float
    combined_score: float
    metadata: Dict[str, Any] = {}

class SearchResponse(BaseModel):
    success: bool
    total_candidates: int
    candidates: List[CandidateMatch]

class RemoveReportResponse(BaseModel):
    success: bool
    report_id: str
    message: str

class HealthResponse(BaseModel):
    status: str
    chroma_available: bool
    collection_name: str
    total_documents: int
    version: str
