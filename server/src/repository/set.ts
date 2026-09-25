export interface LocationDetails {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface EvidenceItem {
  type: "image" | "video" | "document" | "other";
  url: string;
}

export interface ReportDraft {
  category: string | null;
  subcategory: string | null;

  problemDescription: string | null;
  location: LocationDetails | null;

  issueType: string | null;
  serviceOrScheme: string | null;

  relevantDateOrDuration: string | null;
  applicationStatus: string | null;

  evidence: EvidenceItem[] | null;

  riskOrUrgency: string | null;
  impact: string | null;
  desiredResolution: string | null;
}
