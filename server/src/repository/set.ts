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
  affectedPeople?: string | null;
  supportedBy?: string[];
}

export type RequestedInputType =
  | "text"
  | "location"
  | "image"
  | "document"
  | "evidence"
  | "date"
  | "selection"
  | "general";

export interface AIResponsePayload {
  assistantMessage: string;
  reportDraft: ReportDraft;
  missingRequiredFields: string[];
  requiredFields: string[];
  isComplete: boolean;
  aiQueryType: string;
  requestedInputType: RequestedInputType;
  requestedField: string | null;
}
