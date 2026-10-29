from typing import List
import chromadb.utils.embedding_functions as embedding_functions
from app.core.config import settings

class EmbeddingService:
    def __init__(self):
        # By default, use ChromaDB's ONNX-based MiniLM embedding function.
        # This provides fast, reproducible, offline embeddings without external API reliance.
        # It handles English, proper nouns, and normalized civic descriptions accurately.
        self._embedding_function = embedding_functions.DefaultEmbeddingFunction()

    def get_embedding_function(self):
        return self._embedding_function

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        return self._embedding_function(texts)

embedding_service = EmbeddingService()
