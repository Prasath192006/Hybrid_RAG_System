import os
from dotenv import load_dotenv

load_dotenv()

PREFERRED_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash"
]

def generate_answer(prompt: str) -> str:
    """
    Generate a grounded answer using Gemini via Google AI Studio API.
    
    :param prompt: Formatted grounded RAG prompt.
    :return: Text response string from Gemini.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.strip() in ["", "your-gemini-api-key-here", "your-gemini-api-key"]:
        return (
            "[GEMINI_API_KEY not configured] Please set a valid GEMINI_API_KEY "
            "in ml-service/.env to enable live LLM generation."
        )

    errors = []

    # 1. Attempt generation using google-genai SDK first
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        for model_name in PREFERRED_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as ex:
                errors.append(f"google-genai ({model_name}): {ex}")
    except ImportError:
        pass

    # 2. Fallback to google-generativeai SDK
    try:
        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=api_key)
        for model_name in PREFERRED_MODELS:
            try:
                model = genai_legacy.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                if response and response.text:
                    return response.text.strip()
            except Exception as ex:
                errors.append(f"google-generativeai ({model_name}): {ex}")
    except Exception as ex:
        errors.append(f"google-generativeai init: {ex}")

    return f"Failed to generate answer from Gemini. Errors: {'; '.join(errors)}"
