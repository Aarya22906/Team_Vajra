
import json
import os
from pathlib import Path
from typing import TypeVar

from dotenv import load_dotenv
from groq import Groq
from pydantic import BaseModel, ValidationError
from json_repair import repair_json

load_dotenv()

T = TypeVar("T", bound=BaseModel)

MAX_ATTEMPTS = 3


class LLMClientError(Exception):
    """Raised when AI generation fails after retries."""


def ask_json(
    system_prompt: str,
    user_prompt: str,
    schema: type[T],
) -> T:
    """
    Ask Groq for JSON, validate it against a Pydantic model,
    and retry up to three times if generation or validation fails.
    """

    # Mock mode: load a saved JSON response without calling Groq.
    if os.getenv("MOCK_LLM", "false").lower() == "true":
        sample_path = Path(
            os.getenv("MOCK_JSON_PATH", "samples/mock_response.json")
        )

        if not sample_path.is_absolute():
            sample_path = Path(__file__).resolve().parents[2] / sample_path

        if not sample_path.exists():
            raise FileNotFoundError(
                f"Mock JSON file not found: {sample_path}"
            )

        data = json.loads(sample_path.read_text(encoding="utf-8"))
        return schema.model_validate(data)

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise LLMClientError("GROQ_API_KEY is missing from backend/.env")

    client = Groq(api_key=api_key)
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    last_error = None
    repair_feedback = ""

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            system_prompt
                            + "\nReturn a single valid JSON object. "
                            "Do not use Markdown fences."
                        ),
                    },
                    {
                        "role": "user",
                        "content": user_prompt + repair_feedback,
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Groq returned an empty response.")

            # Attempt to recover malformed JSON, then validate strictly.
            try:
                data = json.loads(content)
            except json.JSONDecodeError:
                data = json.loads(repair_json(content))

            return schema.model_validate(data)

        except (ValueError, ValidationError) as exc:
            last_error = exc
            repair_feedback = (
                "\nYour previous response failed validation. "
                f"Error: {str(exc)[:1500]}\n"
                "Generate a corrected JSON object matching the schema."
            )

        except Exception as exc:
            # Stop retrying configuration/authentication failures.
            if getattr(exc, "status_code", None) in (400, 401, 403, 404):
                raise LLMClientError(
                    f"Groq API configuration or request error: {exc}"
                ) from exc

            last_error = exc
            repair_feedback = (
                "\nThe previous attempt failed. Try again with valid JSON."
            )

    raise LLMClientError(
        f"Generation failed after {MAX_ATTEMPTS} attempts: {last_error}"
    ) from last_error
