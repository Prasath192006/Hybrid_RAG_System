import os
import pymupdf as fitz
import docx

def parse_file(file_path: str, file_type: str = None) -> str:
    """
    Extract raw text from PDF, DOCX, and TXT files.
    
    :param file_path: Path to the target file.
    :param file_type: Optional file type/extension hint (e.g., 'pdf', 'docx', 'txt').
    :return: Extracted plain text string.
    """
    if not file_type:
        _, ext = os.path.splitext(file_path)
        file_type = ext.lstrip(".").lower()
    else:
        file_type = file_type.lstrip(".").lower()

    if file_type == "pdf":
        text_content = []
        doc = fitz.open(file_path)
        for page in doc:
            text_content.append(page.get_text())
        return "\n".join(text_content)

    elif file_type == "docx":
        doc = docx.Document(file_path)
        text_content = [paragraph.text for paragraph in doc.paragraphs if paragraph.text]
        return "\n".join(text_content)

    elif file_type == "txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    else:
        raise ValueError(f"Unsupported file format: {file_type}. Supported formats: pdf, docx, txt")
