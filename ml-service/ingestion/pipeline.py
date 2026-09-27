import uuid
from qdrant_client.http import models

from ingestion.parser import parse_file
from ingestion.chunker import chunk_text
from ingestion.dense_encoder import encode_dense
from ingestion.sparse_encoder import encode_sparse
from qdrant_setup import get_qdrant_client, init_collection, COLLECTION_NAME

def run_ingestion_pipeline(file_path: str, filename: str, file_type: str, document_id: str):
    """
    Run full ingestion pipeline: parse -> chunk -> encode -> index into Qdrant.
    """
    # 1. Parse text from file
    raw_text = parse_file(file_path, file_type=file_type)
    if not raw_text or not raw_text.strip():
        raise ValueError("Extracted document text is empty.")

    # 2. Chunk text
    chunks = chunk_text(raw_text, chunk_size=500, overlap=50)
    if not chunks:
        raise ValueError("No valid text chunks generated.")

    texts = [chunk["text"] for chunk in chunks]

    # 3. Generate dense & sparse vector embeddings
    dense_vectors = encode_dense(texts)
    sparse_vectors = encode_sparse(texts)

    # 4. Build Qdrant points
    points = []
    for i, chunk in enumerate(chunks):
        chunk_idx = chunk["chunk_index"]
        chunk_str = chunk["text"]
        chunk_id = f"{document_id}_{chunk_idx}"
        point_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))

        point = models.PointStruct(
            id=point_uuid,
            vector={
                "dense": dense_vectors[i],
                "sparse": sparse_vectors[i]
            },
            payload={
                "document_id": document_id,
                "chunk_id": chunk_id,
                "chunk_index": chunk_idx,
                "filename": filename,
                "text": chunk_str
            }
        )
        points.append(point)

    # 5. Connect and upsert into Qdrant
    client = get_qdrant_client()
    init_collection(client)

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )
    print(f"Successfully ingested {len(points)} chunks for document '{document_id}' into Qdrant collection '{COLLECTION_NAME}'.")
