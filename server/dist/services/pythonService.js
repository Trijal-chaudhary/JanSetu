"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pythonService = exports.PythonService = void 0;
class PythonService {
    constructor() {
        this.baseUrl = (process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
        this.apiKey = process.env.INTERNAL_API_KEY || "jansetu-internal-secret-2026";
        this.timeoutMs = 12000; // Allow sufficient time for initial ONNX model warm-up
    }
    getHeaders() {
        return {
            "Content-Type": "application/json",
            "X-Internal-API-Key": this.apiKey,
        };
    }
    async checkHealth() {
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
            return (await res.json());
        }
        catch (err) {
            console.warn("Python Vector Service health check warning:", err.message);
            return null;
        }
    }
    async indexReports(reports) {
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
            return (await res.json());
        }
        catch (err) {
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
    async searchSimilar(query) {
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
            const data = (await res.json());
            return {
                success: data.success ?? true,
                candidates: Array.isArray(data.candidates) ? data.candidates : [],
            };
        }
        catch (err) {
            console.warn("Python semantic matching unavailable:", err.message);
            return { success: false, candidates: [] };
        }
    }
    async removeReport(reportId) {
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
        }
        catch (err) {
            console.error("Failed to remove report vector:", err.message);
            return false;
        }
    }
}
exports.PythonService = PythonService;
exports.pythonService = new PythonService();
//# sourceMappingURL=pythonService.js.map