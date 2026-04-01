import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@dataclass(frozen=True)
class Settings:
    app_name: str
    market_data_provider: str
    finnhub_api_key: str
    alpha_vantage_api_key: str
    openai_api_key: str
    openai_model: str
    cors_origins: list[str]
    cors_origin_regex: str


@lru_cache
def get_settings() -> Settings:
    origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return Settings(
        app_name="BudgetVest API",
        market_data_provider=os.getenv("MARKET_DATA_PROVIDER", "auto").strip().lower(),
        finnhub_api_key=os.getenv("FINNHUB_API_KEY", "").strip(),
        alpha_vantage_api_key=os.getenv("ALPHA_VANTAGE_API_KEY", "").strip(),
        openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5.4-mini").strip(),
        cors_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
        cors_origin_regex=r"https?://((localhost|127\.0\.0\.1)(:\d+)?|([a-zA-Z0-9-]+\.)*vercel\.app)",
    )
