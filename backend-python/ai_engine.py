import json
import google.generativeai as genai
import openai
from config import Config
from prompts import PromptTemplates

# Configure APIs
if Config.GEMINI_API_KEY or Config.GOOGLE_API_KEY:
    genai.configure(api_key=Config.GEMINI_API_KEY or Config.GOOGLE_API_KEY)

if Config.OPENAI_API_KEY:
    openai.api_key = Config.OPENAI_API_KEY

MODEL_PREFERENCES = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
]


def _list_supported_models():
    try:
        models = genai.list_models()
        valid = []
        for model in models:
            methods = getattr(model, "supported_generation_methods", []) or []
            if "generateContent" in methods:
                valid.append(model.name.replace("models/", ""))
        return valid
    except Exception:
        return []


def _pick_model():
    available = _list_supported_models()
    for candidate in MODEL_PREFERENCES:
        if candidate in available:
            return candidate
    return available[0] if available else "gemini-2.0-flash"


def _generate_text(prompt):
    model_name = _pick_model()
    try:
        model = genai.GenerativeModel(model_name)
        return model.generate_content(prompt).text
    except Exception:
        available = _list_supported_models()
        for fallback in available:
            try:
                model = genai.GenerativeModel(fallback)
                return model.generate_content(prompt).text
            except Exception:
                continue
        raise

def extract_json(text):
    """Clean AI response to find JSON block"""
    try:
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end != -1:
            return text[start:end]
        return text
    except:
        return text

def generate_study_material(text, model_choice="Gemini"):
    json_format = '{"summary": "...", "flashcards": [{"q": "..", "a": ".."}], "mcqs": []}'
    prompt = PromptTemplates.get_study_material_prompt(text, json_format)
    
    if model_choice == "Gemini":
        response = _generate_text(prompt)
    else:
        # Placeholder for OpenAI logic
        response = "{}" 

    cleaned_json = extract_json(response)
    return json.loads(cleaned_json)

def translate_material(content_json, target_language, model_choice="Gemini"):
    """Translates the generated JSON material into the target language"""
    # Convert dict to string for the prompt
    json_str = json.dumps(content_json)
    prompt = PromptTemplates.get_translation_prompt(json_str, target_language)
    
    if model_choice == "Gemini":
        response = _generate_text(prompt)
    else:
        response = json_str # Fallback

    cleaned_json = extract_json(response)
    return json.loads(cleaned_json)

def chat_with_ai(question, document, history, model_choice="Gemini"):
    prompt = PromptTemplates.get_chat_prompt(document, str(history), question)
    if model_choice == "Gemini":
        return _generate_text(prompt)
    return "OpenAI chat not implemented yet."
