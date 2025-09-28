from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

VECTOR_PROVIDER = os.getenv("VECTOR_PROVIDER", "faiss")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
