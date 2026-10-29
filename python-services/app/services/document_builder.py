import re
from typing import Optional
from app.schemas.report import ReportItem

def normalize_text(text: Optional[str]) -> str:
    """Consistently clean and normalize text before embedding."""
    if not text:
        return ""
    # Strip excessive whitespaces and standardize linebreaks
    cleaned = re.sub(r"\s+", " ", text).strip()
    return cleaned

def build_searchable_document(report: ReportItem) -> str:
    """
    Constructs an objective semantic document representing the physical infrastructure problem.
    Adheres strictly to Phase C:
    - Includes: category, subcategory, problemDescription, issueType, serviceOrScheme, 
                location context, desiredResolution, impact.
    - Excludes: supporter counts, severity scores, affected population numbers, 
                current status, user credentials/IDs, or private information.
    """
    sections = []
    
    if report.subcategory:
        sections.append(f"Infrastructure Type: {normalize_text(report.subcategory)}")
    elif report.category:
        sections.append(f"Category: {normalize_text(report.category)}")
        
    if report.issueType:
        sections.append(f"Specific Defect: {normalize_text(report.issueType)}")
        
    if report.problemDescription:
        sections.append(f"Description: {normalize_text(report.problemDescription)}")
        
    if report.location and report.location.address:
        sections.append(f"Physical Location Context: {normalize_text(report.location.address)}")
        
    if report.serviceOrScheme:
        sections.append(f"Responsible Public Body/Scheme: {normalize_text(report.serviceOrScheme)}")
        
    if report.impact:
        sections.append(f"Civic Impact: {normalize_text(report.impact)}")
        
    if report.desiredResolution:
        sections.append(f"Requested Remediation: {normalize_text(report.desiredResolution)}")
        
    return "\n".join(sections)
