def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """
    Split text into fixed-size chunks with overlapping boundaries.
    
    :param text: Input string to chunk.
    :param chunk_size: Target character/token size per chunk.
    :param overlap: Character/token overlap between consecutive chunks.
    :return: List of chunk dictionaries with 'text' and 'chunk_index'.
    """
    if not text or not text.strip():
        return []

    cleaned_text = text.strip()
    chunks = []
    start = 0
    text_length = len(cleaned_text)
    chunk_index = 0

    step = max(1, chunk_size - overlap)

    while start < text_length:
        end = min(text_length, start + chunk_size)
        chunk_str = cleaned_text[start:end]
        
        if chunk_str.strip():
            chunks.append({
                "text": chunk_str,
                "chunk_index": chunk_index
            })
            chunk_index += 1
            
        start += step

    return chunks
