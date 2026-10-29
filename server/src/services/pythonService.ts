export interface NormalizedReport {
  id: string;
  source: "mongodb" | "json_dataset";
  category?: string | null;
  subcategory?: string | null;
  problemDescription?: string | null;
  location?: {
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  issueType?: string | null;
  serviceOrScheme?: string | null;
  relevantDateOrDuration?: string | null;
  applicationStatus?: string | null;
  impact?: string | null;
  desiredResolution?: string | null;
  affectedPeople?: string | null;
  riskOrUrgency?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SemanticSearchQuery {
  category: string;
  subcategory?: string | null;
  problemDescription: string;
  issueType?: string | null;
  location?: {
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  radius_km?: number;
  limit?: number;
  threshold?: number;
}

export interface CandidateVectorMatch {
  report_id: string;
  source: string;
  category?: string;
  subcategory?: string;
  issue_type?: string;
  distance_km?: number | null;
  similarity_score: number;
  combined_score: number;
  metadata?: Record<string, any>;
}

export interface IndexResponse {
  success: boolean;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export class PythonService {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor() {
    this.baseUrl = (process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    this.apiKey = process.env.INTERNAL_API_KEY || "jansetu-internal-secret-2026";
    this.timeoutMs = 12000; // Allow sufficient time for initial ONNX model warm-up
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-Internal-API-Key": this.apiKey,
    };
  }

  public async checkHealth(): Promise<{ status: string; chroma_available: boolean; total_documents: number } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.baseUrl}/internal/v1/health`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return null;
      }
      return (await res.json()) as any;
    } catch (err: any) {
      console.warn("Python Vector Service health check warning:", err.message);
      return null;
    }
  }

  public async indexReports(reports: NormalizedReport[]): Promise<IndexResponse> {
    if (!reports || reports.length === 0) {
      return {
        success: true,
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // larger timeout for batch indexing

      const res = await fetch(`${this.baseUrl}/internal/v1/reports/index`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ reports }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Python indexing returned HTTP error:", res.status, errorText);
        return {
          success: false,
          processed: reports.length,
          inserted: 0,
          updated: 0,
          skipped: 0,
          failed: reports.length,
          errors: [`HTTP ${res.status}: ${errorText}`],
        };
      }

      return (await res.json()) as IndexResponse;
    } catch (err: any) {
      console.error("Python service indexing connection error:", err.message);
      return {
        success: false,
        processed: reports.length,
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: reports.length,
        errors: [err.message || "Failed to connect to Python vector service"],
      };
    }
  }

  public async searchSimilar(query: SemanticSearchQuery): Promise<{ success: boolean; candidates: CandidateVectorMatch[] }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.baseUrl}/internal/v1/reports/search`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(query),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        console.warn("Python search HTTP error:", res.status, errText);
        return { success: false, candidates: [] };
      }

      const data = (await res.json()) as any;
      return {
        success: data.success ?? true,
        candidates: Array.isArray(data.candidates) ? data.candidates : [],
      };
    } catch (err: any) {
      console.warn("Python semantic matching unavailable:", err.message);
      return { success: false, candidates: [] };
    }
  }

  public async removeReport(reportId: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.baseUrl}/internal/v1/reports/${encodeURIComponent(reportId)}/remove`, {
        method: "DELETE",
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return res.ok;
    } catch (err: any) {
      console.error("Failed to remove report vector:", err.message);
      return false;
    }
  }
}

export const pythonService = new PythonService();
