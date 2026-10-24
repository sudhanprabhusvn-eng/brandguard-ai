from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.config import settings
from server import database
from server.routes import auth_routes, profile_routes, evaluation_routes, approval_routes, audit_routes

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await database.connect_to_database()
    yield
    # Shutdown
    await database.close_database_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise Brand Governance & Conformance API (FastAPI + MongoDB + JWT Auth)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for local dev & Vercel previews
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(auth_routes.router, prefix=settings.API_V1_STR)
app.include_router(profile_routes.router, prefix=settings.API_V1_STR)
app.include_router(evaluation_routes.router, prefix=settings.API_V1_STR)
app.include_router(approval_routes.router, prefix=settings.API_V1_STR)
app.include_router(audit_routes.router, prefix=settings.API_V1_STR)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "BrandGuard AI FastAPI Governance Server",
        "version": "1.0.0",
        "database": {
            "type": "MongoDB" if database.is_connected_to_mongo else "Resilient In-Memory Fallback",
            "connected": database.is_connected_to_mongo,
            "database_name": settings.DATABASE_NAME
        },
        "auth": {
            "type": "JWT Bearer Authentication (HS256)",
            "roles": ["brand_manager", "creator", "approver", "admin"]
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="127.0.0.1", port=8000, reload=True)
