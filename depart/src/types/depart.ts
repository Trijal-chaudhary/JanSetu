export interface DepartmentLocation {
  area?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export interface DepartmentInfo {
  departmentId: string;
  departmentName: string;
  category: string;
  subcategories: string[];
  username?: string;
  location?: DepartmentLocation;
}

export interface ReportLocation {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ReportItem {
  _id?: string;
  id?: string;
  category: string;
  subcategory: string;
  problemDescription: string;
  location?: ReportLocation | null;
  issueType?: string | null;
  serviceOrScheme?: string | null;
  relevantDateOrDuration?: string | null;
  applicationStatus?: string | null;
  evidence?: (string | { url?: string; type?: string })[] | null;
  riskOrUrgency?: string | null;
  impact?: string | null;
  desiredResolution?: string | null;
  affectedPeople?: string | null;
  supportedBy?: string[];
  commentCount?: number;
  distanceKm?: number;
  createdAt?: string;
  updatedAt?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userId?: string;
  resolutionRemark?: string | null;
  resolutionEvidence?: (string | { url?: string; type?: string })[] | null;
  resolutionDate?: string | null;
  activityHistory?: {
    action: string;
    previousStatus?: string | null;
    newStatus: string;
    remark?: string | null;
    performedBy?: string | null;
    performedByType?: string;
    createdAt: string;
  }[];
}

export type StatusType = "Reported" | "Under Review" | "In Progress" | "Resolved" | "Closed" | "Reopened" | "Rejected";
