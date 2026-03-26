import io
import json
import os
import re
import tempfile
import urllib.request
from functools import lru_cache
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import PyPDF2

from readers import read_file

try:
    import torch
except Exception:
    torch = None

try:
    from faster_whisper import WhisperModel
except Exception:
    WhisperModel = None

# moviepy is no longer needed since faster-whisper supports video formats natively

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"))

ALLOWED_TYPES = {
    "summary",
    "flashcards",
    "mcq",
    "fill_blanks",
    "yes_no",
    "true_false",
    "memory_map",
    "wh_questions",
}

MODEL_PREFERENCES = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
]

DOCUMENT_EXTENSIONS = {
    ".pdf", ".docx", ".txt", ".md", ".rtf", ".csv", ".json", ".html", ".htm", ".xml",
    ".log", ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".c", ".cpp", ".cs", ".go",
    ".php", ".sql", ".css", ".scss", ".less", ".yml", ".yaml", ".ppt", ".pptx",
}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif", ".gif"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".wma", ".opus", ".mpga"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".wmv", ".mpeg", ".mpg"}
UNIVERSAL_INPUT_MESSAGE = (
    "Unsupported file type. Upload documents, code/text files, images, audio, video, or provide pasted text/URLs."
)
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cuda")


def _list_supported_gemini_models() -> List[str]:
    try:
        models = genai.list_models()
        names: List[str] = []
        for model in models:
            methods = getattr(model, "supported_generation_methods", []) or []
            if "generateContent" in methods:
                names.append(model.name.replace("models/", ""))
        return names
    except Exception:
        return []


def _pick_gemini_model(preferred: str = "") -> str:
    available = _list_supported_gemini_models()
    if not available:
        # Keep a modern default if listing is unavailable.
        return preferred or os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    candidates: List[str] = []
    if preferred:
        candidates.append(preferred)
    env_preferred = os.getenv("GEMINI_MODEL", "")
    if env_preferred:
        candidates.append(env_preferred)
    candidates.extend(MODEL_PREFERENCES)

    for candidate in candidates:
        if candidate in available:
            return candidate

    return available[0]


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = []
        for page in pdf_reader.pages:
            text.append(page.extract_text() or "")
        return "\n".join(text).strip()
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Failed to extract PDF text: {error}")


@lru_cache(maxsize=1)
def _load_transcription_model():
    if WhisperModel is None:
        raise RuntimeError(
            "faster-whisper is not installed. Install faster-whisper and its dependencies to enable audio/video transcription."
        )

    device = WHISPER_DEVICE
    compute_type = "float16" if device == "cuda" else "int8"
    if torch is not None:
        try:
            if device == "cuda" and not torch.cuda.is_available():
                device = "cpu"
                compute_type = "int8"
        except Exception:
            device = "cpu"
            compute_type = "int8"

    import gc
    try:
        model = WhisperModel(WHISPER_MODEL_SIZE, device=device, compute_type=compute_type)
        return model
    except Exception:
        # Fallback to CPU if CUDA initialization fails (e.g. missing cudnn/dll issues)
        gc.collect()
        if torch is not None and hasattr(torch.cuda, "empty_cache"):
            torch.cuda.empty_cache()
        return WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")


def _transcribe_media_file(path: str, extension: str) -> str:
    try:
        model = _load_transcription_model()
        # faster-whisper uses PyAV which natively supports parsing video files (like MP4) and extracting their audio automatically. No need for moviepy.
        segments, info = model.transcribe(path, beam_size=5, vad_filter=True)
        transcript = " ".join(segment.text.strip() for segment in segments if segment.text and segment.text.strip()).strip()
        
        if not transcript:
            raise RuntimeError("No speech could be transcribed from the uploaded media.")

        language = getattr(info, "language", None)
        if language:
            return f"[Detected language: {language}]\n\n{transcript}"
        return transcript
    except RuntimeError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        # Catch unexpected CUDA out-of-memory or PyAV decoding errors
        raise HTTPException(status_code=400, detail=f"Failed to transcribe media: {error}")


def _extract_text_from_upload(file: UploadFile, file_bytes: bytes) -> str:
    filename = (file.filename or "").lower()
    extension = os.path.splitext(filename)[1]

    with tempfile.NamedTemporaryFile(delete=False, suffix=extension or ".bin") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        if extension == ".pdf":
            return _extract_text_from_pdf(file_bytes)

        if extension in AUDIO_EXTENSIONS or extension in VIDEO_EXTENSIONS:
            return _transcribe_media_file(tmp_path, extension)

        if extension in DOCUMENT_EXTENSIONS or extension in IMAGE_EXTENSIONS:
            extracted = read_file(tmp_path, extension)
            if extracted:
                return extracted

        if extension in {".doc"}:
            raise HTTPException(
                status_code=400,
                detail="Legacy .doc files are not directly readable here. Please convert to .docx or PDF.",
            )
            
        # UNIVERSAL INPUT FALLBACK: 
        # Attempt standard file read for unknown extensions, parsing as plain text.
        extracted = read_file(tmp_path, ".txt")
        if extracted and len(extracted.strip()) > 5:
            return extracted
            
        # Final universal binary-to-text string extraction for any fully unrecognised format
        import string
        import re
        printable = set(string.printable.encode("ascii"))
        chars = [chr(b) if b in printable else " " for b in file_bytes]
        text = re.sub(r'\s+', ' ', "".join(chars)).strip()
        if len(text) > 10:
            return text
            
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    try:
        # Ultimate fallback
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail=UNIVERSAL_INPUT_MESSAGE)


def _extract_text_from_url(url: str) -> str:
    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; AsknLearnBot/1.0)"},
        )
        with urllib.request.urlopen(request, timeout=20) as response:
            raw_html = response.read().decode("utf-8", errors="ignore")
        clean_text = re.sub(r"<script.*?>.*?</script>", " ", raw_html, flags=re.DOTALL | re.IGNORECASE)
        clean_text = re.sub(r"<style.*?>.*?</style>", " ", clean_text, flags=re.DOTALL | re.IGNORECASE)
        clean_text = re.sub(r"<[^>]+>", " ", clean_text)
        clean_text = re.sub(r"\s+", " ", clean_text).strip()
        return clean_text
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL content: {error}")


def _clamp_count(value: Any, default: int, max_value: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(1, min(parsed, max_value))


def _build_schema(content_types: List[str], counts: Dict[str, Any]) -> str:
    blocks = []

    if "summary" in content_types:
        blocks.append('"summary": "Short but complete study summary"')
    if "flashcards" in content_types:
        n = _clamp_count(counts.get("flashcards"), 8, 30)
        blocks.append(f'"flashcards": [{{"q": "Question", "a": "Answer"}}] // exactly {n} items')
    if "mcq" in content_types:
        n = _clamp_count(counts.get("mcq"), 8, 40)
        blocks.append(
            f'"mcq": [{{"question": "...", "options": {{"A":"...", "B":"...", "C":"...", "D":"..."}}, "correct_option":"A", "explanation":"..."}}] // exactly {n} items'
        )
    if "fill_blanks" in content_types:
        n = _clamp_count(counts.get("fill_blanks"), 6, 30)
        blocks.append(f'"fill_blanks": [{{"question":"...", "answer":"..."}}] // exactly {n} items')
    if "yes_no" in content_types:
        n = _clamp_count(counts.get("yes_no"), 6, 30)
        blocks.append(f'"yes_no": [{{"question":"...", "answer":"Yes"}}] // exactly {n} items')
    if "true_false" in content_types:
        n = _clamp_count(counts.get("true_false"), 6, 30)
        blocks.append(f'"true_false": [{{"question":"...", "answer":"True"}}] // exactly {n} items')
    if "wh_questions" in content_types:
        n = _clamp_count(counts.get("wh_questions"), 6, 30)
        blocks.append(f'"wh_questions": [{{"question":"...", "answer":"..."}}] // exactly {n} items')
    if "memory_map" in content_types:
        blocks.append('"memory_map": "Mermaid mindmap syntax only"')

    return "{\n  " + ",\n  ".join(blocks) + "\n}"


def _build_prompt(source_text: str, content_types: List[str], counts: Dict[str, Any], language: str) -> str:
    schema = _build_schema(content_types, counts)
    return f"""You are an expert study-assistant AI.
Return ONLY one valid JSON object matching the schema below. No markdown fences, no extra text.
Use language: {language}.

Schema:
{schema}

Rules:
- Keep output fully grounded in source content.
- For multiple-choice questions, correct_option must be one of A/B/C/D.
- For memory_map, return Mermaid mindmap syntax as a single string.
- Mermaid memory_map must begin with exactly `mindmap`.
- Use spaces for indentation only.
- Do not use bullets, numbering, markdown headings, arrows, or explanation text in memory_map.
- Keep node labels short and plain.
- Example:
  mindmap
    root((Main Topic))
      Branch One
        Detail A
      Branch Two
        Detail B
- Do not add any keys not present in schema.

Source content:
{source_text[:12000]}
"""


def _extract_json_object(text: str) -> Dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}") + 1
    if start < 0 or end <= start:
        raise ValueError("Model did not return JSON")
    return json.loads(text[start:end])


def _safe_json_loads(payload: str, default):
    try:
        return json.loads(payload)
    except Exception:
        return default


def _extract_response_text(response: Any) -> str:
    direct_text = getattr(response, "text", None)
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()

    chunks: List[str] = []
    for candidate in getattr(response, "candidates", None) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", None) or []:
            text = getattr(part, "text", None)
            if isinstance(text, str) and text.strip():
                chunks.append(text.strip())

    merged = "\n".join(chunks).strip()
    if merged:
        return merged
    raise RuntimeError("Model returned no usable text.")


def _generate_with_gemini(prompt: str, preferred_model: str = "") -> Dict[str, Any]:
    primary = _pick_gemini_model(preferred_model)
    tried = [primary]
    last_error = None

    for model_name in tried + [name for name in MODEL_PREFERENCES if name not in tried]:
        try:
            ai_model = genai.GenerativeModel(model_name)
            response_text = _extract_response_text(ai_model.generate_content(prompt))
            return {
                "model_used": model_name,
                "response_text": response_text,
            }
        except Exception as error:
            last_error = error
            continue

    available = _list_supported_gemini_models()
    for model_name in available:
        if model_name in tried:
            continue
        try:
            ai_model = genai.GenerativeModel(model_name)
            response_text = _extract_response_text(ai_model.generate_content(prompt))
            return {
                "model_used": model_name,
                "response_text": response_text,
            }
        except Exception as error:
            last_error = error

    raise RuntimeError(f"All Gemini model attempts failed: {last_error}")


@app.post("/process-file")
async def process_file(
    file: UploadFile = File(default=None),
    sourceText: str = Form(default=""),
    sourceName: str = Form(default=""),
    model: str = Form(default="Gemini"),
    language: str = Form(default="English"),
    contentTypes: str = Form(default='["summary","flashcards","mcq"]'),
    counts: str = Form(default="{}"),
):
    try:
        if file is None and not sourceText.strip():
            raise HTTPException(status_code=400, detail="Provide either a file or sourceText.")

        extracted_text = sourceText.strip()
        filename = sourceName.strip() or (file.filename if file else "text-input")

        if file is not None:
            file_bytes = await file.read()
            extracted_text = _extract_text_from_upload(file, file_bytes)
        elif extracted_text.lower().startswith(("http://", "https://")):
            extracted_text = _extract_text_from_url(extracted_text)

        if not extracted_text or len(extracted_text.strip()) < 20:
            raise HTTPException(status_code=400, detail="Could not extract enough text from source.")

        try:
            requested_types = json.loads(contentTypes)
            if not isinstance(requested_types, list):
                requested_types = []
        except json.JSONDecodeError:
            requested_types = []

        requested_types = [item for item in requested_types if item in ALLOWED_TYPES]
        if not requested_types:
            requested_types = ["summary", "flashcards", "mcq"]

        try:
            parsed_counts = json.loads(counts) if counts else {}
            if not isinstance(parsed_counts, dict):
                parsed_counts = {}
        except json.JSONDecodeError:
            parsed_counts = {}

        prompt = _build_prompt(extracted_text, requested_types, parsed_counts, language)

        if model.lower() not in {"gemini", "openai"}:
            model = "Gemini"

        preferred_model = os.getenv("GEMINI_MODEL", "")
        if model.lower() == "gemini":
            generation = _generate_with_gemini(prompt, preferred_model=preferred_model)
        else:
            # OpenAI path can be wired later. We still use Gemini fallback for now.
            generation = _generate_with_gemini(prompt, preferred_model=preferred_model)

        response_text = generation["response_text"]

        generated = _extract_json_object(response_text)
        return {
            "status": "success",
            "filename": filename,
            "source_text": extracted_text[:20000],
            "data": generated,
            "selected_types": requested_types,
            "model_used": generation["model_used"],
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"AI Processing failed: {error}")


@app.post("/chat")
async def chat_about_material(
    question: str = Form(...),
    sourceText: str = Form(default=""),
    generatedJson: str = Form(default="{}"),
    history: str = Form(default="[]"),
    language: str = Form(default="English"),
    socratic_mode: bool = Form(default=False),
):
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question is required.")

    generated = _safe_json_loads(generatedJson, {})
    chat_history = _safe_json_loads(history, [])
    if socratic_mode:
        prompt = f"""You are AsknLearn Tutor, practicing Socratic method.
Answer in {language}.
Instead of giving the direct answer immediately, ask a guiding question that helps the user figure it out themselves.
Still be friendly and encouraging.

Source material:
{sourceText[:8000]}

User question:
{question}
"""
    else:
        prompt = f"""You are AsknLearn Tutor, a precise study coach.
Answer in {language}.
Use ONLY the information in source material and generated content.
If answer is not present, clearly say it is not in provided material.

Source material:
{sourceText[:4000]}

Generated content JSON:
{json.dumps(generated)[:4000]}

Conversation history:
{json.dumps(chat_history)[:2000]}

User question:
{question}
"""

    prompt += """

CRITICAL REQUIRED OUTPUT FORMAT:
You MUST respond with a valid JSON block enclosed in ```json and ```.
The JSON must have this exact structure:
{
  "answer": "your detailed response here...",
  "suggested_followups": ["Question 1?", "Question 2?", "Question 3?"]
}
"""
    try:
        generation = _generate_with_gemini(prompt, preferred_model=os.getenv("GEMINI_MODEL", ""))
        text = generation["response_text"].strip()
        
        # Cleanup markdown JSON blocks
        if "```json" in text:
            text = text.split("```json")[-1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[-1].split("```")[0].strip()
            
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = {"answer": generation["response_text"], "suggested_followups": []}

        return {
            "answer": parsed.get("answer", generation["response_text"]),
            "suggested_followups": parsed.get("suggested_followups", []),
            "model_used": generation["model_used"],
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Chat failed: {error}")


@app.get("/models")
async def list_models():
    try:
        return {
            "models": _list_supported_gemini_models(),
            "preferred_env_model": os.getenv("GEMINI_MODEL", ""),
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to list models: {error}")
