from fastapi import APIRouter, Header, HTTPException, status, Depends
from typing import Optional

from app.core.config import settings
from app.schemas.report import (
    BatchIndexRequest,
    BatchIndexResponse,
    SearchRequest,
    SearchResponse,
    RemoveReportResponse,
    HealthResponse,
)
from app.services.chroma_service import chroma_service

router = APIRouter(prefix="/internal/v1", tags=["Internal Vector Operations"])

def verify_internal_auth(x_internal_api_key: Optional[str] = Header(None)):
    if settings.INTERNAL_API_KEY:
        if not x_internal_api_key or x_internal_api_key != settings.INTERNAL_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized: Invalid internal API key",
            )
    return True

@router.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint to verify Python service and ChromaDB status."""
    return chroma_service.get_health()

@router.post(
    "/reports/index",
    response_model=BatchIndexResponse,
    dependencies=[Depends(verify_internal_auth)],
)
def index_reports(payload: BatchIndexRequest):
    """
    Accepts normalized grievance reports from Node.js and indexes them in ChromaDB.
    Supports historical batch vectorization and incremental single report indexing.
    """
    if not payload.reports:
        return BatchIndexResponse(
            success=True,
            processed=0,
            inserted=0,
            updated=0,
            skipped=0,
            failed=0,
            errors=[],
        )
    return chroma_service.index_reports(payload.reports)

@router.post(
    "/reports/search",
    response_model=SearchResponse,
    dependencies=[Depends(verify_internal_auth)],
)
def search_similar_reports(query: SearchRequest):
    """
    Performs location-aware semantic similarity search for Public Infrastructure reports.
    Computes spatial proximity, semantic similarity, and subcategory compatibility.
    """
    if not query.problemDescription or not query.problemDescription.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Problem description cannot be empty for semantic search.",
        )
    return chroma_service.search_similar(query)

@router.delete(
    "/reports/{report_id}/remove",
    response_model=RemoveReportResponse,
    dependencies=[Depends(verify_internal_auth)],
)
def remove_report(report_id: str):
    """
    Removes a report's vector record from ChromaDB when deleted or resolved.
    """
    if not report_id or not report_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid report_id is required.",
        )
    return chroma_service.remove_report(report_id)

@router.post(
    "/reports/{report_id}/remove",
    response_model=RemoveReportResponse,
    dependencies=[Depends(verify_internal_auth)],
)
def remove_report_post(report_id: str):
    """POST alternative to remove report vector record."""
    return remove_report(report_id)
