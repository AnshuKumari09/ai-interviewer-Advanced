import json

from groq import Groq

from app.config import settings

client = Groq(api_key=settings.groq_api_key)


def chat_json(
    system: str, user: str, temperature: float = 0.2, model: str | None = None, max_tokens: int = 4096
) -> dict:
    res = client.chat.completions.create(
        model=model or settings.groq_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_object"},
        temperature=temperature,
        reasoning_effort="low",
        max_completion_tokens=max_tokens,
    )
    return json.loads(res.choices[0].message.content)


def chat_text(system: str, messages: list[dict], temperature: float = 0.6, model: str | None = None) -> str:
    res = client.chat.completions.create(
        model=model or settings.groq_fast_model,
        messages=[{"role": "system", "content": system}, *messages],
        temperature=temperature,
        reasoning_effort="low",
        max_completion_tokens=1024,  # reasoning model hai, chhota budget rakha to jawab khaali aata hai
    )
    return (res.choices[0].message.content or "").strip()