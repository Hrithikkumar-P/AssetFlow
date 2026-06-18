import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth, users, assets, asset_types, employees, dashboard,
    prices, repairs, history, approvals,
)


app = FastAPI(
    title="IT Asset Management System",
    version="2.0.0",
    description="REST API for dynamic IT asset types, assets, pricing, repairs and history.",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Restrict which web origins may call the API. Override with the CORS_ORIGINS
# env var (comma-separated list of exact origins). Defaults to the local dev
# frontends (Vite :5173 and the nginx container :3000). Never use "*" in
# production — list the real site origin(s) instead.
_DEFAULT_ORIGINS = "http://localhost:3000,http://localhost:5173"
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(asset_types.router, prefix="/api/asset-types", tags=["Asset Types"])
app.include_router(assets.router, prefix="/api/assets", tags=["Assets"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(prices.router, prefix="/api/prices", tags=["Pricing"])
app.include_router(repairs.router, prefix="/api/repairs", tags=["Repairs"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(approvals.router, prefix="/api/approvals", tags=["Approvals"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "IT Asset Management System API",
        "version": "2.0.0",
        "docs": "/docs",
    }
