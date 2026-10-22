
"""
ingestion/parser.py

Structure-aware document parsing using the LlamaCloud v2 Parse API.
Extracts document content as Markdown while preserving headings,
tables, lists, and other document structure.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from llama_cloud import LlamaCloud

load_dotenv()


def parse_file(file_path: str, file_type: str | None = None) -> str:
    """
    Parse a document using the LlamaCloud v2 API and return Markdown text.

    Args:
        file_path: Path to the document being parsed.
        file_type: Optional file type retained for compatibility with
                   the existing ingestion pipeline.

    Returns:
        Extracted document content as a Markdown string.

    Raises:
        EnvironmentError: If LLAMA_CLOUD_API_KEY is missing.
        FileNotFoundError: If the document does not exist.
        ValueError: If parsing returns no usable text.
        RuntimeError: If the parsing API fails.
    """

    api_key = os.getenv("LLAMA_CLOUD_API_KEY")

    if not api_key:
        raise EnvironmentError(
            "LLAMA_CLOUD_API_KEY is not set. "
            "Add it to ml-service/.env"
        )

    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError(
            f"Document not found: {file_path}"
        )

    try:
        client = LlamaCloud(api_key=api_key)

        # Upload the document to LlamaCloud for parsing.
        uploaded_file = client.files.create(
            file=str(path),
            purpose="parse",
        )

        # Parse using the v2 API and request Markdown output.
        result = client.parsing.parse(
            file_id=uploaded_file.id,
            tier="agentic",
            version="latest",
            expand=["markdown"],
        )

        # Collect Markdown from all returned pages.
        markdown_result = getattr(result, "markdown", None)
        pages = getattr(markdown_result, "pages", None) or []

        full_markdown_text = "\n\n".join(
            page.markdown
            for page in pages
            if getattr(page, "markdown", None)
        ).strip()

        if not full_markdown_text:
            raise ValueError(
                f"LlamaCloud returned no Markdown text for "
                f"'{path.name}'."
            )

        print(
            f"Successfully parsed '{path.name}' "
            f"({len(full_markdown_text)} characters)."
        )

        return full_markdown_text

    except ValueError:
        raise

    except Exception as exc:
        raise RuntimeError(
            f"Failed to parse '{path.name}' using LlamaCloud v2: {exc}"
        ) from exc
