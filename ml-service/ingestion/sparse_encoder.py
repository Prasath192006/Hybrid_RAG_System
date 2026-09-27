from fastembed import SparseTextEmbedding
from qdrant_client.http import models

_sparse_model = None

def get_sparse_model() -> SparseTextEmbedding:
    global _sparse_model
    if _sparse_model is None:
        _sparse_model = SparseTextEmbedding(model_name="Qdrant/bm25")
    return _sparse_model

def encode_sparse(texts: list[str]) -> list[models.SparseVector]:
    """
    Generate BM25 sparse vectors using FastEmbed Qdrant/bm25.
    
    :param texts: List of text strings.
    :return: List of qdrant models.SparseVector objects.
    """
    if not texts:
        return []
    model = get_sparse_model()
    sparse_embeddings = list(model.embed(texts))
    
    sparse_vectors = []
    for se in sparse_embeddings:
        indices = se.indices.tolist() if hasattr(se.indices, 'tolist') else list(se.indices)
        values = se.values.tolist() if hasattr(se.values, 'tolist') else list(se.values)
        sparse_vectors.append(
            models.SparseVector(
                indices=indices,
                values=values
            )
        )
    return sparse_vectors
