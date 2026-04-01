from typing import Any

from pydantic import BaseModel, Field


class BudgetRequest(BaseModel):
    monthly_income: float = Field(ge=0)
    rent_housing: float = Field(ge=0)
    utilities: float = Field(ge=0)
    groceries: float = Field(ge=0)
    transportation: float = Field(ge=0)
    entertainment: float = Field(ge=0)
    savings_goal: float = Field(ge=0)
    other_expenses: float = Field(ge=0)


class BudgetBreakdownItem(BaseModel):
    label: str
    value: float
    share_of_income: float


class BudgetResponse(BaseModel):
    total_planned_expenses: float
    remaining_balance: float
    savings_percentage: float
    health_status: str
    health_summary: str
    highlights: list[str]
    breakdown: list[BudgetBreakdownItem]


class StockSearchResult(BaseModel):
    symbol: str
    description: str


class StockQuoteResponse(BaseModel):
    company_name: str
    ticker: str
    current_price: float
    daily_change: float
    percent_change: float
    high_price: float | None = None
    low_price: float | None = None
    open_price: float | None = None
    previous_close: float | None = None
    exchange: str | None = None
    currency: str | None = None


class AssistantRequest(BaseModel):
    monthly_income: float = Field(ge=0)
    savings_goal: float = Field(ge=0)
    risk_tolerance: str
    focus_area: str
    primary_goal: str


class AssistantResponse(BaseModel):
    persona: str
    summary: str
    recommendations: list[str]
    next_steps: list[str]
    caution: str


class PortfolioRequest(BaseModel):
    initial_amount: float = Field(ge=0)
    monthly_contribution: float = Field(ge=0)
    risk_tolerance: str
    time_horizon: str
    primary_goal: str
    interests: list[str] = Field(default_factory=list)


class PortfolioAllocationItem(BaseModel):
    name: str
    percentage: int
    reason: str


class PortfolioSuggestionItem(BaseModel):
    category: str
    fit: str
    examples: list[str]


class PortfolioResponse(BaseModel):
    investor_profile: str
    summary: str
    projected_contribution: float
    allocation: list[PortfolioAllocationItem]
    suggestions: list[PortfolioSuggestionItem]
    next_steps: list[str]
    caution: str


class PortfolioAdvisorRequest(BaseModel):
    monthly_income: float = Field(ge=0)
    savings_goal: float = Field(ge=0)
    initial_amount: float = Field(ge=0)
    monthly_contribution: float = Field(ge=0)
    risk_tolerance: str
    time_horizon: str
    primary_goal: str
    interests: list[str] = Field(default_factory=list)
    future_plans: str = ""


class PortfolioAdvisorInsight(BaseModel):
    title: str
    detail: str


class PortfolioProjectionPoint(BaseModel):
    year: int
    estimated_value: float
    total_contributions: float
    projected_growth: float


class PortfolioAdvisorResponse(BaseModel):
    provider: str
    investor_profile: str
    summary: str
    allocation: list[PortfolioAllocationItem]
    suggestions: list[PortfolioSuggestionItem]
    next_steps: list[str]
    insights: list[PortfolioAdvisorInsight]
    projections: list[PortfolioProjectionPoint]
    caution: str


class PortfolioChatMessage(BaseModel):
    role: str
    content: str


class PortfolioFollowUpRequest(BaseModel):
    profile: PortfolioAdvisorRequest
    latest_plan: PortfolioAdvisorResponse | None = None
    question: str = Field(min_length=3, max_length=600)
    history: list[PortfolioChatMessage] = Field(default_factory=list)


class PortfolioFollowUpResponse(BaseModel):
    provider: str
    answer: str
    highlights: list[str]
    action_items: list[str]
    caution: str


class AuthRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: str
    password: str = Field(min_length=6, max_length=120)


class AuthLoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=6, max_length=120)


class UserSummary(BaseModel):
    id: int
    name: str
    email: str


class AuthResponse(BaseModel):
    token: str
    user: UserSummary


class SavedStatePayload(BaseModel):
    state: dict[str, Any] = Field(default_factory=dict)


class SavedStateResponse(BaseModel):
    state: dict[str, Any]
