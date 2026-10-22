"""
ingestion/pipeline.py
──────────────────────
End-to-end ingestion pipeline:

    parse_file → chunk_text → encode_dense + encode_sparse → upsert to Qdrant

Each Qdrant point payload now carries ``structural_metadata`` (the header
hierarchy extracted by the Markdown chunker) alongside the existing fields,
enabling future metadata-filtered retrieval and richer source citations in the
frontend.
"""

from __future__ import annotations

import uuid
from qdrant_client.http import models

from ingestion.parser       import parse_file
from ingestion.chunker      import chunk_text
from ingestion.dense_encoder  import encode_dense
from ingestion.sparse_encoder import encode_sparse
from qdrant_setup import get_qdrant_client, init_collection, COLLECTION_NAME


def run_ingestion_pipeline(
    file_path:   str,
    filename:    str,
    file_type:   str,
    document_id: str,
) -> None:
    """
    Parse, chunk, embed, and index a document into Qdrant.

    This function is intentionally synchronous so it can be safely called
    inside a FastAPI ``BackgroundTasks`` handler without blocking the event
    loop (FastAPI runs background tasks in a thread-pool executor).

    Parameters
    ----------
    file_path : str
        Local path to the temporary uploaded file.
    filename : str
        Original filename shown to the user (stored in Qdrant payload).
    file_type : str
        File extension (e.g. ``"pdf"``), forwarded to the parser.
    document_id : str
        UUID string assigned to this document at upload time.

    Raises
    ------
    ValueError
        If the parser or chunker returns empty content.
    """
    # ── 1. Parse ──────────────────────────────────────────────────────────────
    markdown_text: str = parse_file(file_path, file_type=file_type)
    if not markdown_text or not markdown_text.strip():
        raise ValueError("Extracted document text is empty.")

    # ── 2. Chunk (structure-aware) ────────────────────────────────────────────
    chunks: list[dict] = chunk_text(markdown_text)
    if not chunks:
        raise ValueError("No valid text chunks generated.")

    # Extract the enriched text strings (header-prefixed) for the encoders.
    texts: list[str] = [chunk["text"] for chunk in chunks]

    # ── 3. Encode: dense (all-MiniLM-L6-v2) + sparse (BM25) ─────────────────
    dense_vectors  = encode_dense(texts)
    sparse_vectors = encode_sparse(texts)

    # ── 4. Build Qdrant PointStructs ─────────────────────────────────────────
    points: list[models.PointStruct] = []

    for i, chunk in enumerate(chunks):
        chunk_idx:  int  = chunk["chunk_index"]
        chunk_text_: str = chunk["text"]
        chunk_id:   str  = f"{document_id}_{chunk_idx}"

        # Deterministic UUID so re-ingesting the same chunk overwrites it.
        point_uuid: str = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))

        point = models.PointStruct(
            id=point_uuid,
            vector={
                "dense":  dense_vectors[i],
                "sparse": sparse_vectors[i],
            },
            payload={
                "document_id":        document_id,
                "chunk_id":           chunk_id,
                "chunk_index":        chunk_idx,
                "filename":           filename,
                "text":               chunk_text_,
                # NEW: header hierarchy from MarkdownHeaderTextSplitter
                "structural_metadata": chunk.get("structural_metadata", {}),
            },
        )
        points.append(point)

    # ── 5. Upsert into Qdrant ─────────────────────────────────────────────────
    client = get_qdrant_client()
    init_collection(client)

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
    )

    print(
        f"[pipeline] Ingested {len(points)} chunks for document "
        f"'{document_id}' ({filename}) into '{COLLECTION_NAME}'."
    )
