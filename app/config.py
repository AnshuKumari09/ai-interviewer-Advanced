from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )
    supabase_url: str
    supabase_service_key: str
    supabase_anon_key: str
    groq_api_key: str
    sarvam_api_key: str
    groq_model: str = "openai/gpt-oss-120b"
    groq_fast_model: str = "openai/gpt-oss-20b" 


settings = Settings()

