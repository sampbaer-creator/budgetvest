from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .auth import get_bearer_token, get_current_user
from .config import get_settings
from .database import (
    authenticate_user,
    create_session,
    create_user,
    delete_session,
    init_db,
    load_user_state,
    save_user_state,
)
from .models import (
    AssistantRequest,
    AssistantResponse,
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthResponse,
    BudgetRequest,
    BudgetResponse,
    PortfolioAdvisorRequest,
    PortfolioAdvisorResponse,
    PortfolioFollowUpRequest,
    PortfolioFollowUpResponse,
    PortfolioRequest,
    PortfolioResponse,
    SavedStatePayload,
    SavedStateResponse,
    StockQuoteResponse,
    StockSearchResult,
    UserSummary,
)
from .services import (
    analyze_budget,
    build_assistant_guidance,
    build_portfolio_ai_advice,
    build_portfolio_follow_up,
    build_portfolio_plan,
    fetch_stock_quote,
    search_stocks,
)


settings = get_settings()
app = FastAPI(title=settings.app_name)

# Allow the Vite frontend to call this API during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "app": settings.app_name}


@app.post("/api/auth/register", response_model=AuthResponse)
def register(payload: AuthRegisterRequest) -> dict:
    try:
        user = create_user(payload.name, payload.email, payload.password)
        token = create_session(user["id"])
        return {"token": token, "user": user}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: AuthLoginRequest) -> dict:
    try:
        user = authenticate_user(payload.email, payload.password)
        token = create_session(user["id"])
        return {"token": token, "user": user}
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@app.post("/api/auth/logout")
def logout(token: str = Depends(get_bearer_token)) -> dict[str, str]:
    delete_session(token)
    return {"status": "ok"}


@app.get("/api/auth/me", response_model=UserSummary)
def current_user(user: dict = Depends(get_current_user)) -> dict:
    return user


@app.get("/api/user/state", response_model=SavedStateResponse)
def get_saved_state(user: dict = Depends(get_current_user)) -> dict:
    return {"state": load_user_state(user["id"])}


@app.put("/api/user/state", response_model=SavedStateResponse)
def put_saved_state(payload: SavedStatePayload, user: dict = Depends(get_current_user)) -> dict:
    return {"state": save_user_state(user["id"], payload.state)}


@app.post("/api/budget/analyze", response_model=BudgetResponse)
def budget_analysis(payload: BudgetRequest) -> dict:
    # Keep the budget logic in a dedicated service so the app is easy to expand later.
    return analyze_budget(payload)


@app.get("/api/market/search", response_model=list[StockSearchResult])
async def market_search(q: str = Query(..., min_length=1)) -> list[dict]:
    try:
        return await search_stocks(q, settings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Stock search is temporarily unavailable.") from exc


@app.get("/api/market/quote", response_model=StockQuoteResponse)
async def market_quote(ticker: str = Query(..., min_length=1)) -> dict:
    try:
        return await fetch_stock_quote(ticker, settings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Live market data could not be loaded right now.") from exc


@app.post("/api/assistant/recommend", response_model=AssistantResponse)
def assistant_recommendations(payload: AssistantRequest) -> dict:
    return build_assistant_guidance(payload)


@app.post("/api/portfolio/plan", response_model=PortfolioResponse)
def portfolio_plan(payload: PortfolioRequest) -> dict:
    return build_portfolio_plan(payload)


@app.post("/api/portfolio/advice", response_model=PortfolioAdvisorResponse)
async def portfolio_advice(payload: PortfolioAdvisorRequest) -> dict:
    return await build_portfolio_ai_advice(payload, settings)


@app.post("/api/portfolio/chat", response_model=PortfolioFollowUpResponse)
async def portfolio_chat(payload: PortfolioFollowUpRequest) -> dict:
    return await build_portfolio_follow_up(payload, settings)
