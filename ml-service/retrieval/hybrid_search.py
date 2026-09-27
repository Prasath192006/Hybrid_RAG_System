from typing import Optional
from qdrant_client.http import models

from ingestion.dense_encoder import encode_dense
from ingestion.sparse_encoder import encode_sparse
from qdrant_setup import get_qdrant_client, init_collection, COLLECTION_NAME

def hybrid_search(query: str, document_ids: Optional[list[str]] = None, top_k: int = 20) -> list[dict]:
    """
    Perform hybrid vector search in Qdrant fusing dense and BM25 sparse retrieval with RRF.
    
    :param query: Natural language search query string.
    :param document_ids: Optional list of document_ids to filter results.
    :param top_k: Maximum number of fused candidate chunks to retrieve.
    :return: List of candidate chunk dicts with payload and rrf_score.
    """
    if not query or not query.strip():
        return []

    # 1. Encode query with dense and sparse encoders
    dense_vector = encode_dense([query])[0]
    sparse_vector = encode_sparse([query])[0]

    # 2. Build filter condition for document_ids if provided
    query_filter = None
    if document_ids and len(document_ids) > 0:
        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchAny(any=document_ids)
                )
            ]
        )

    # 3. Build dense and sparse prefetch requests
    dense_prefetch = models.Prefetch(
        query=dense_vector,
        using="dense",
        limit=top_k,
        filter=query_filter
    )

    sparse_prefetch = models.Prefetch(
        query=sparse_vector,
        using="sparse",
        limit=top_k,
        filter=query_filter
    )

    # 4. Execute hybrid query with Reciprocal Rank Fusion (RRF)
    client = get_qdrant_client()
    init_collection(client)

    response = client.query_points(
        collection_name=COLLECTION_NAME,
        prefetch=[dense_prefetch, sparse_prefetch],
        query=models.FusionQuery(fusion=models.Fusion.RRF),
        limit=top_k
    )

    # 5. Extract candidate chunks with payload details
    candidate_chunks = []
    for point in response.points:
        payload = point.payload or {}
        candidate_chunks.append({
            "point_id": str(point.id),
            "rrf_score": float(point.score),
            "text": payload.get("text", ""),
            "document_id": payload.get("document_id", ""),
            "chunk_id": payload.get("chunk_id", ""),
            "chunk_index": payload.get("chunk_index", 0),
            "filename": payload.get("filename", "")
        })

    return candidate_chunks
