import os

class Settings:
    PROJECT_NAME: str = "BrandGuard AI Backend"
    API_V1_STR: str = "/api"
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://127.0.0.1:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "brandguard_ai_db")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "brandguard-super-secure-jwt-secret-key-2026-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "https://brandguard-ai.vercel.app"
    ]

settings = Settings()
