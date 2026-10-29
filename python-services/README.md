# JanSetu Python Semantic Services

This service provides ChromaDB-backed vector indexing, embedding generation, and real-time location-aware semantic clustering for citizen grievances in **JanSetu**.

## Service Boundaries

- **Python/FastAPI**: Sole service with direct access to ChromaDB. Responsible for document embedding, spatial distance calculations, vector search, and candidate ranking.
- **Node.js/Express**: Sole service with direct access to MongoDB. Coordinates all citizen workflows, retrieves authoritative reports, validates candidates, and manages supporter records.
- **React**: Interacts exclusively with Node.js APIs. Direct access to FastAPI is strictly prohibited.

## Directory Structure

```
python-services/
├── app/
│   ├── api/
│   │   └── endpoints.py        # /internal/v1 routes (health, index, search, remove)
│   ├── core/
│   │   └── config.py           # Pydantic Settings & environment variables
│   ├── schemas/
│   │   └── report.py           # Pydantic request/response validation schemas
│   ├── services/
│   │   ├── chroma_service.py   # ChromaDB client, upsert, and distance-aware ranking
│   │   ├── document_builder.py # Standardized semantic document text builder
│   │   ├── embedding_service.py# ONNX-based sentence transformer embeddings
│   │   └── geo_service.py      # Haversine distance and bounding box calculations
│   └── main.py                 # FastAPI application entrypoint
├── tests/
│   └── test_services.py        # Automated test suite
├── .env.example
├── requirements.txt
└── README.md
```

## Running the Service Locally

1. Create and activate a virtual environment (optional if Python 3.10 is used):
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run FastAPI server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

4. Verify service health:
   ```bash
   curl http://127.0.0.1:8000/internal/v1/health
   ```

## Running Automated Tests

```bash
pytest tests/
```
