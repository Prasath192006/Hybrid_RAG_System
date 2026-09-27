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

def test_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        print(f"Loaded GEMINI_API_KEY: {api_key[:8]}... (length {len(api_key)})")
    else:
        print("GEMINI_API_KEY is missing!")
    
    if not api_key or api_key.strip() in ["", "your-gemini-api-key-here", "your-gemini-api-key"]:
        print("\n[ERROR] GEMINI_API_KEY is not set in ml-service/.env")
        print("Please create a file at ml-service/.env and add:")
        print("GEMINI_API_KEY=AQ.Ab8RN...")
        return

    print("\nAttempting to connect to Gemini API...")
    
    # 1. Try google-genai SDK
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        for model_name in PREFERRED_MODELS:
            try:
                print(f"Testing model '{model_name}' via google-genai...")
                response = client.models.generate_content(
                    model=model_name,
                    contents="Hello! Please confirm in one short sentence that the Gemini API key is working."
                )
                if response and response.text:
                    print("\n[SUCCESS] Response from Gemini:")
                    print(f"Model: {model_name}")
                    print(f"Output: {response.text.strip()}")
                    return
            except Exception as e:
                print(f"   Model '{model_name}' failed: {e}")
    except ImportError as ie:
        print(f"google-genai import failed: {ie}")

    # 2. Try google-generativeai SDK
    try:
        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=api_key)
        for model_name in PREFERRED_MODELS:
            try:
                print(f"Testing model '{model_name}' via google-generativeai...")
                model = genai_legacy.GenerativeModel(model_name)
                response = model.generate_content("Hello! Please confirm in one short sentence that the Gemini API key is working.")
                if response and response.text:
                    print("\n[SUCCESS] Response from Gemini:")
                    print(f"Model: {model_name}")
                    print(f"Output: {response.text.strip()}")
                    return
            except Exception as e:
                print(f"   Model '{model_name}' failed: {e}")
    except Exception as e:
        print(f"google-generativeai failed: {e}")

    print("\n[ERROR] Failed to generate response from Gemini API.")

if __name__ == "__main__":
    test_gemini()
