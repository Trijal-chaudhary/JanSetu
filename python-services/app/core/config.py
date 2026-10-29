import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "JanSetu Semantic Vector Service"
    APP_VERSION: str = "1.0.0"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # Internal Security
    INTERNAL_API_KEY: str = "jansetu-internal-secret-2026"
    
    # ChromaDB Configuration
    CHROMA_PERSIST_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "chroma_data"
    )
    COLLECTION_NAME: str = "jansetu_infrastructure_reports"
    
    # Embedding Configuration
    # Uses fast, multilingual-compatible sentence transformer or chromadb default
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    
    # Default Matching Parameters
    DEFAULT_SEARCH_RADIUS_KM: float = 10.0
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.45
    
    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }

settings = Settings()
