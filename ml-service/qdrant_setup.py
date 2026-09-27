import os
from qdrant_client import QdrantClient
from qdrant_client.http import models
from dotenv import load_dotenv

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

COLLECTION_NAME = "documents"

_qdrant_client_instance: QdrantClient = None

def get_qdrant_client() -> QdrantClient:
    """
    Initialize and return singleton QdrantClient instance.
    Reuses instance so in-memory fallback persists across calls within the process.
    """
    global _qdrant_client_instance
    if _qdrant_client_instance is None:
        if QDRANT_URL and QDRANT_API_KEY:
            _qdrant_client_instance = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        else:
            _qdrant_client_instance = QdrantClient(":memory:")
    return _qdrant_client_instance

def init_collection(client: QdrantClient = None):
    """Ensure the 'documents' collection exists with named dense and sparse vectors and payload index."""
    if client is None:
        client = get_qdrant_client()
    
    existing_collections = [c.name for c in client.get_collections().collections]
    
    if COLLECTION_NAME not in existing_collections:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={
                "dense": models.VectorParams(
                    size=384,
                    distance=models.Distance.COSINE
                )
            },
            sparse_vectors_config={
                "sparse": models.SparseVectorParams()
            }
        )
        print(f"Collection '{COLLECTION_NAME}' created successfully.")

    # Ensure payload index exists for document_id filtering
    try:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="document_id",
            field_schema=models.PayloadSchemaType.KEYWORD
        )
    except Exception:
        pass  # Payload index already exists

if __name__ == "__main__":
    init_collection()
