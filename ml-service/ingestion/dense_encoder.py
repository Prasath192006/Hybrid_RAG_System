from sentence_transformers import SentenceTransformer

_dense_model = None

def get_dense_model() -> SentenceTransformer:
    global _dense_model
    if _dense_model is None:
        _dense_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _dense_model

def encode_dense(texts: list[str]) -> list[list[float]]:
    """
    Generate 384-dimensional dense vectors using all-MiniLM-L6-v2.
    
    :param texts: List of text strings.
    :return: List of dense vector embeddings (list of float lists).
    """
    if not texts:
        return []
    model = get_dense_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings.tolist()
