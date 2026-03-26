class PromptTemplates:
    @staticmethod
    def get_study_material_prompt(text: str, json_format: str) -> str:
        return f"""You are an AI study assistant. Your ONLY task is to return a valid JSON object based on the text provided.
Do not explain, do not think aloud, and include ONLY the keys requested in the format below.

Format (must match exactly):
{json_format}

Text to process:
{text[:4000]}

--- REMEMBER ---
Output ONLY the JSON object. Nothing else."""

    @staticmethod
    def get_chat_prompt(document: str, chat_history: str, question: str) -> str:
        return f"""You are an AI tutor helping a student understand their study material. 
Document Content:
{document[:3000]}

Previous Conversation:
{chat_history}

Current Question: {question}
Provide a clear, concise, and helpful answer."""

    @staticmethod
    def get_translation_prompt(json_content: str, target_language: str) -> str:
        return f"""Translate the text values in this JSON to {target_language}. 
Keep keys exactly the same. Do not translate mermaid mind maps.
JSON: {json_content}"""