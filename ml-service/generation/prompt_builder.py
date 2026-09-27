def build_rag_prompt(query: str, chunks: list[dict]) -> str:
    """
    Construct a grounded RAG prompt from user query and reranked context chunks.
    
    :param query: User's question string.
    :param chunks: List of reranked context chunk dicts with 'text', 'filename', and 'chunk_id'.
    :return: Formatted prompt string.
    """
    context_passages = []
    for i, chunk in enumerate(chunks, 1):
        filename = chunk.get("filename", "Unknown")
        chunk_id = chunk.get("chunk_id", f"chunk_{i}")
        text = chunk.get("text", "").strip()
        context_passages.append(
            f"--- Context Document [{i}] (File: {filename}, ID: {chunk_id}) ---\n{text}"
        )

    context_str = "\n\n".join(context_passages) if context_passages else "No context documents provided."

    prompt = f"""You are a strict, grounded AI assistant for a Retrieval-Augmented Generation (RAG) system.

SYSTEM INSTRUCTIONS:
1. Answer the user's question ONLY using the factual context provided below.
2. Do NOT use outside knowledge, extrapolate, or make assumptions beyond what is explicitly stated in the context.
3. If the answer cannot be found or answered directly from the provided context documents, you MUST respond with:
"I don't know based on the provided documents"

CONTEXT DOCUMENTS:
{context_str}

USER QUESTION:
{query}

ANSWER:"""

    return prompt
