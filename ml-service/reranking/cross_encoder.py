from sentence_transformers import CrossEncoder

_cross_encoder_model = None

def get_cross_encoder() -> CrossEncoder:
    """
    Lazy singleton initializer for sentence-transformers CrossEncoder.
    """
    global _cross_encoder_model
    if _cross_encoder_model is None:
        _cross_encoder_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _cross_encoder_model

def rerank(query: str, candidate_chunks: list[dict], top_k: int = 5) -> list[dict]:
    """
    Rerank candidate chunks using CrossEncoder ms-marco-MiniLM-L-6-v2.
    
    :param query: Search query string.
    :param candidate_chunks: List of dictionaries containing at least a 'text' field.
    :param top_k: Number of top scoring chunks to return.
    :return: List of sorted candidate chunk dictionaries with 'score' added.
    """
    if not candidate_chunks:
        return []

    model = get_cross_encoder()

    # Form (query, document_chunk_text) pairs
    pairs = [(query, chunk.get("text", "")) for chunk in candidate_chunks]

    # Predict cross-encoder relevance scores
    scores = model.predict(pairs)

    # Attach score to candidate chunk objects
    reranked_chunks = []
    for i, chunk in enumerate(candidate_chunks):
        chunk_copy = dict(chunk)
        chunk_copy["score"] = float(scores[i])
        reranked_chunks.append(chunk_copy)

    # Sort descending by score
    reranked_chunks.sort(key=lambda x: x["score"], reverse=True)

    return reranked_chunks[:top_k]
