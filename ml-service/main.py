import os
import uuid
import tempfile
import traceback
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from ingestion.pipeline import run_ingestion_pipeline
from retrieval.hybrid_search import hybrid_search
from reranking.cross_encoder import rerank
from generation.prompt_builder import build_rag_prompt
from generation.llm_client import generate_answer

load_dotenv()

app = FastAPI(title="ML Service")

# In-memory document ingestion status tracker
INGEST_STATUS: dict[str, str] = {}

class RetrieveRequest(BaseModel):
    query: str
    document_ids: Optional[List[str]] = None
    top_k: Optional[int] = 5

class QueryRequest(BaseModel):
    query: str
    document_ids: Optional[List[str]] = None
    top_k: Optional[int] = 5

@app.get("/health")
def health_check():
    return {"status": "ok"}

def process_ingestion_bg(tmp_path: str, filename: str, file_type: str, document_id: str):
    """
    Background worker function for document ingestion pipeline.
    """
    try:
        run_ingestion_pipeline(
            file_path=tmp_path,
            filename=filename,
            file_type=file_type,
            document_id=document_id
        )
        INGEST_STATUS[document_id] = "ready"
    except Exception as e:
        print(f"Ingestion failed for document {document_id}: {e}")
        traceback.print_exc()
        INGEST_STATUS[document_id] = "failed"
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/ingest")
async def ingest_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_id: Optional[str] = Form(None)
):
    """
    Asynchronous document ingestion endpoint.
    Accepts file upload, returns processing status immediately, and runs pipeline in background.
    """
    if not document_id or not document_id.strip():
        document_id = str(uuid.uuid4())

    filename = file.filename
    _, ext = os.path.splitext(filename)
    file_type = ext.lstrip(".").lower()

    if file_type not in ["pdf", "docx", "txt"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file_type}'. Allowed formats: pdf, docx, txt"
        )

    # Save uploaded file to temp file
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_type}") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save temporary file: {str(e)}")

    # Set status to processing
    INGEST_STATUS[document_id] = "processing"

    # Queue background task
    background_tasks.add_task(
        process_ingestion_bg,
        tmp_path=tmp_path,
        filename=filename,
        file_type=file_type,
        document_id=document_id
    )

    return {
        "document_id": document_id,
        "status": "processing"
    }

@app.get("/ingest/{document_id}/status")
def get_ingest_status(document_id: str):
    """
    Retrieve ingestion status for a given document_id.
    """
    status = INGEST_STATUS.get(document_id)
    if not status:
        raise HTTPException(status_code=404, detail="Document ID not found.")
    return {
        "document_id": document_id,
        "status": status
    }

@app.post("/retrieve")
def retrieve_chunks(request: RetrieveRequest):
    """
    Hybrid Search + Cross-Encoder Reranking endpoint (for testing/debug).
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")

    top_k_retrieve = 20
    top_k_rerank = request.top_k if request.top_k and request.top_k > 0 else 5

    fused_candidates = hybrid_search(
        query=request.query,
        document_ids=request.document_ids,
        top_k=top_k_retrieve
    )

    if not fused_candidates:
        return {
            "query": request.query,
            "results": []
        }

    reranked_results = rerank(
        query=request.query,
        candidate_chunks=fused_candidates,
        top_k=top_k_rerank
    )

    return {
        "query": request.query,
        "results": reranked_results
    }

@app.post("/query")
def query_rag(request: QueryRequest):
    """
    End-to-End RAG Query endpoint.
    Performs hybrid search -> CrossEncoder reranking -> prompt construction -> Gemini LLM answer generation.
    Returns generated grounded answer and list of source document chunks used.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")

    top_k_retrieve = 20
    top_k_rerank = request.top_k if request.top_k and request.top_k > 0 else 5

    # 1. Hybrid Vector Search (Dense + Sparse RRF)
    fused_candidates = hybrid_search(
        query=request.query,
        document_ids=request.document_ids,
        top_k=top_k_retrieve
    )

    if not fused_candidates:
        return {
            "answer": "I don't know based on the provided documents",
            "sources": []
        }

    # 2. Cross-Encoder Reranking
    reranked_chunks = rerank(
        query=request.query,
        candidate_chunks=fused_candidates,
        top_k=top_k_rerank
    )

    # 3. Build Grounded Prompt
    prompt = build_rag_prompt(query=request.query, chunks=reranked_chunks)

    # 4. Generate Answer via Gemini API
    answer = generate_answer(prompt)

    # 5. Extract Sources Summary
    sources = [
        {
            "filename": chunk.get("filename", ""),
            "chunk_id": chunk.get("chunk_id", ""),
            "text_snippet": chunk.get("text", "")[:200]
        }
        for chunk in reranked_chunks
    ]

    return {
        "answer": answer,
        "sources": sources
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
