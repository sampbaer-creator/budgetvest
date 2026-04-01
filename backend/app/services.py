import json
from typing import Any

import httpx

from .config import Settings
from .models import (
    AssistantRequest,
    BudgetBreakdownItem,
    BudgetRequest,
    PortfolioAdvisorRequest,
    PortfolioAdvisorResponse,
    PortfolioFollowUpRequest,
    PortfolioRequest,
)


FINNHUB_BASE_URL = "https://finnhub.io/api/v1"
ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"


def estimate_annual_return(risk_tolerance: str) -> float:
    assumptions = {
        "low": 0.045,
        "medium": 0.07,
        "high": 0.09,
    }
    return assumptions.get(risk_tolerance, 0.07)


def projection_years_for_horizon(time_horizon: str) -> list[int]:
    if time_horizon == "0_5":
        return [1, 3, 5]
    if time_horizon == "5_10":
        return [1, 3, 5, 10]
    return [1, 3, 5, 10, 20]


def build_projection_points(initial_amount: float, monthly_contribution: float, risk_tolerance: str, time_horizon: str) -> list[dict[str, float | int]]:
    annual_return = estimate_annual_return(risk_tolerance)
    monthly_return = annual_return / 12
    points: list[dict[str, float | int]] = []

    for year in projection_years_for_horizon(time_horizon):
        months = year * 12
        value = float(initial_amount)

        for _ in range(months):
            value = (value + monthly_contribution) * (1 + monthly_return)

        contributions = round(initial_amount + (monthly_contribution * months), 2)
        estimated_value = round(value, 2)
        points.append(
            {
                "year": year,
                "estimated_value": estimated_value,
                "total_contributions": contributions,
                "projected_growth": round(estimated_value - contributions, 2),
            }
        )

    return points


def format_allocation_context(allocation: list[dict[str, Any]]) -> str:
    return "\n".join(
        f"- {item.get('name', 'Allocation')}: {item.get('percentage', 0)}% ({item.get('reason', 'No reason provided')})"
        for item in allocation
    )


def get_alpha_vantage_error(payload: dict[str, Any]) -> str | None:
    if payload.get("Note"):
        return "Alpha Vantage rate limit reached. Please wait a minute and try again."
    if payload.get("Information"):
        return str(payload["Information"])
    if payload.get("Error Message"):
        return str(payload["Error Message"])
    return None


def analyze_budget(payload: BudgetRequest) -> dict[str, Any]:
    categories = [
        ("Rent / Housing", payload.rent_housing),
        ("Utilities", payload.utilities),
        ("Groceries", payload.groceries),
        ("Transportation", payload.transportation),
        ("Entertainment", payload.entertainment),
        ("Savings Goal", payload.savings_goal),
        ("Other Expenses", payload.other_expenses),
    ]

    income = payload.monthly_income
    total_expenses = round(sum(amount for _, amount in categories), 2)
    remaining_balance = round(income - total_expenses, 2)
    savings_percentage = round((payload.savings_goal / income) * 100, 1) if income else 0.0
    housing_ratio = round((payload.rent_housing / income) * 100, 1) if income else 0.0
    essentials = payload.rent_housing + payload.utilities + payload.groceries + payload.transportation
    essentials_ratio = round((essentials / income) * 100, 1) if income else 0.0

    if income == 0:
        health_status = "Needs setup"
        health_summary = "Add a monthly income to see a realistic budget picture."
    elif remaining_balance < 0:
        health_status = "Overspending"
        health_summary = "Your plan is over budget right now, so trimming spending or adjusting the savings goal would help."
    elif remaining_balance <= income * 0.05 or savings_percentage < 5:
        health_status = "Tight but manageable"
        health_summary = "You can make this work, but your plan has very little cushion for surprises."
    elif remaining_balance >= income * 0.2 and savings_percentage >= 15:
        health_status = "Strong position to save/invest"
        health_summary = "Your budget leaves healthy room for both saving and future investing."
    else:
        health_status = "Healthy budget"
        health_summary = "Your monthly plan looks balanced and gives you a reasonable amount of flexibility."

    highlights = [
        f"Housing uses about {housing_ratio}% of your income.",
        f"Essentials take up roughly {essentials_ratio}% of your monthly income.",
        f"Your savings target is {savings_percentage}% of income.",
    ]

    if remaining_balance < 0:
        highlights.append(
            f"You are short by ${abs(remaining_balance):,.2f}, so reducing variable expenses would be a smart first step."
        )
    else:
        highlights.append(f"You still have ${remaining_balance:,.2f} left after your plan.")

    breakdown = [
        BudgetBreakdownItem(
            label=label,
            value=round(value, 2),
            share_of_income=round((value / income) * 100, 1) if income else 0.0,
        ).model_dump()
        for label, value in categories
    ]

    return {
        "total_planned_expenses": total_expenses,
        "remaining_balance": remaining_balance,
        "savings_percentage": savings_percentage,
        "health_status": health_status,
        "health_summary": health_summary,
        "highlights": highlights,
        "breakdown": breakdown,
    }


def build_assistant_guidance(payload: AssistantRequest) -> dict[str, Any]:
    income = payload.monthly_income
    savings_goal = payload.savings_goal
    savings_rate = round((savings_goal / income) * 100, 1) if income else 0.0

    if payload.focus_area == "budgeting":
        persona = "Budget-first builder"
    elif payload.focus_area == "investing":
        persona = "Early-stage investor"
    else:
        persona = "Balanced planner"

    summary = (
        f"With a monthly income of ${income:,.0f} and a savings target of ${savings_goal:,.0f}, "
        f"you are setting aside about {savings_rate}% of your income while focusing on {payload.focus_area}."
    )

    recommendations: list[str] = []
    next_steps: list[str] = []

    if savings_rate < 10:
        recommendations.append(
            "Start by protecting consistency: even a modest savings rate becomes powerful when it happens every month."
        )
    else:
        recommendations.append(
            "Your current savings target is a solid base for building an emergency cushion and exploring beginner investments."
        )

    if payload.primary_goal == "save":
        recommendations.append(
            "Prioritize a simple emergency fund before taking on more market risk, especially if your monthly costs can change."
        )
    elif payload.primary_goal == "invest":
        recommendations.append(
            "Keep a cash buffer in place, then learn broad index-fund basics so your first investing steps stay simple."
        )
    else:
        recommendations.append(
            "A split approach can work well: build cash stability first, then invest a smaller amount consistently."
        )

    if payload.risk_tolerance == "low":
        recommendations.append(
            "Lower risk usually means slower growth, but it can help you stay confident and consistent as a beginner."
        )
        caution = "Avoid rushing into volatile stocks before you have short-term savings covered."
    elif payload.risk_tolerance == "high":
        recommendations.append(
            "Higher risk can offer more upside, but keeping most of your plan in diversified investments is still the safer long-term habit."
        )
        caution = "High risk feels exciting, but concentration in a few stocks can hurt beginners quickly."
    else:
        recommendations.append(
            "A medium-risk path often fits beginners well because it balances growth potential with a manageable learning curve."
        )
        caution = "Stay focused on steady habits instead of reacting to daily market swings."

    if payload.focus_area == "budgeting":
        next_steps.extend(
            [
                "Track your three largest categories first so your budget stays easy to maintain.",
                "Review spending weekly instead of waiting until the end of the month.",
                "Raise your savings target gradually as your budget becomes more stable.",
            ]
        )
    elif payload.focus_area == "investing":
        next_steps.extend(
            [
                "Learn the difference between individual stocks, ETFs, and index funds.",
                "Only invest money you will not need for near-term bills.",
                "Start with a repeatable monthly amount instead of trying to time the market.",
            ]
        )
    else:
        next_steps.extend(
            [
                "Set a fixed savings transfer right after payday so your plan happens automatically.",
                "Use your budget to create consistency before increasing investment contributions.",
                "Check your progress monthly and make one small adjustment at a time.",
            ]
        )

    return {
        "persona": persona,
        "summary": summary,
        "recommendations": recommendations,
        "next_steps": next_steps,
        "caution": caution,
    }


def build_portfolio_plan(payload: PortfolioRequest) -> dict[str, Any]:
    horizon = payload.time_horizon
    risk = payload.risk_tolerance
    goal = payload.primary_goal
    interests = set(payload.interests)
    annual_contribution = payload.monthly_contribution * 12
    projected_contribution = round(payload.initial_amount + (annual_contribution * 10), 2)

    if horizon == "10_plus" and risk == "high":
        investor_profile = "Long-horizon growth builder"
        allocation = [
            {"name": "U.S. stock index funds", "percentage": 60, "reason": "Acts as the core long-term growth engine."},
            {"name": "International stock funds", "percentage": 20, "reason": "Adds diversification beyond the U.S. market."},
            {"name": "Bond funds", "percentage": 10, "reason": "Keeps some stability during rougher periods."},
            {"name": "Thematic or sector tilts", "percentage": 10, "reason": "Gives room for personal interests without dominating the plan."},
        ]
    elif risk == "low":
        investor_profile = "Stability-first planner"
        allocation = [
            {"name": "Bond funds", "percentage": 40, "reason": "Provides steadier behavior and lower volatility."},
            {"name": "U.S. stock index funds", "percentage": 35, "reason": "Keeps long-term growth in the mix."},
            {"name": "International stock funds", "percentage": 15, "reason": "Broadens exposure across markets."},
            {"name": "Cash or short-term reserves", "percentage": 10, "reason": "Adds flexibility for near-term needs."},
        ]
    elif horizon in {"5_10", "10_plus"} and risk == "medium":
        investor_profile = "Balanced long-term investor"
        allocation = [
            {"name": "U.S. stock index funds", "percentage": 50, "reason": "Serves as the main growth anchor."},
            {"name": "International stock funds", "percentage": 20, "reason": "Improves diversification across regions."},
            {"name": "Bond funds", "percentage": 20, "reason": "Softens volatility while preserving growth."},
            {"name": "Special-interest tilt", "percentage": 10, "reason": "Leaves room for sector preferences or a focused theme."},
        ]
    else:
        investor_profile = "Goal-focused starter portfolio"
        allocation = [
            {"name": "U.S. stock index funds", "percentage": 45, "reason": "Simple, diversified foundation for beginners."},
            {"name": "International stock funds", "percentage": 15, "reason": "Adds global exposure early."},
            {"name": "Bond funds", "percentage": 25, "reason": "Helps control risk while you build consistency."},
            {"name": "Cash or short-term reserves", "percentage": 15, "reason": "Useful when your timeline is shorter or goals may change."},
        ]

    suggestions = [
        {
            "category": "Core foundation",
            "fit": "Best for almost every beginner because it stays diversified and easy to maintain.",
            "examples": [
                "Broad U.S. stock index fund",
                "Total market fund",
                "S&P 500-style index fund",
            ],
        },
        {
            "category": "Diversification layer",
            "fit": "Useful when you want exposure beyond one country or one market segment.",
            "examples": [
                "International index fund",
                "Global equity fund",
                "Total world fund",
            ],
        },
    ]

    if "dividends" in interests or goal == "income":
        suggestions.append(
            {
                "category": "Income tilt",
                "fit": "Matches investors who care about cash flow and steadier income-producing holdings.",
                "examples": [
                    "Dividend-focused ETF",
                    "High-quality income fund",
                    "Bond fund ladder",
                ],
            }
        )

    if "real_estate" in interests:
        suggestions.append(
            {
                "category": "Real estate exposure",
                "fit": "Adds property-market exposure without buying physical real estate directly.",
                "examples": [
                    "REIT ETF",
                    "Real estate index fund",
                    "Property-sector fund",
                ],
            }
        )

    if {"technology", "innovation", "healthcare", "sustainability"} & interests:
        themed_examples = []
        if "technology" in interests:
            themed_examples.append("Technology sector ETF")
        if "innovation" in interests:
            themed_examples.append("Innovation-focused ETF")
        if "healthcare" in interests:
            themed_examples.append("Healthcare sector ETF")
        if "sustainability" in interests:
            themed_examples.append("ESG or sustainability ETF")

        suggestions.append(
            {
                "category": "Interest-based tilt",
                "fit": "Best used as a smaller side allocation after the diversified core is already in place.",
                "examples": themed_examples[:3] or ["Sector ETF"],
            }
        )

    next_steps = [
        "Build your portfolio in layers: core index funds first, then smaller thematic tilts second.",
        "Automate the monthly contribution so the plan keeps moving even when markets feel noisy.",
        "Review the allocation only a few times a year instead of reacting to every market swing.",
    ]

    if goal == "retirement":
        next_steps.append("Keep the portfolio tax-advantaged when possible, such as through retirement-focused accounts.")
    elif goal == "home":
        next_steps.append("If the home goal is close, keep more of the plan in lower-volatility assets and cash reserves.")
    elif goal == "wealth":
        next_steps.append("Focus on consistency and broad diversification before chasing concentrated bets.")

    summary = (
        f"With ${payload.initial_amount:,.0f} already invested and ${payload.monthly_contribution:,.0f} added monthly, "
        f"this plan leans toward a {investor_profile.lower()} approach for a {horizon.replace('_', '-')} year horizon."
    )

    caution = (
        "This is an educational planning guide, not personalized financial advice. "
        "Broad diversification and consistent contributions usually matter more than picking a perfect theme."
    )

    return {
        "investor_profile": investor_profile,
        "summary": summary,
        "projected_contribution": projected_contribution,
        "allocation": allocation,
        "suggestions": suggestions,
        "next_steps": next_steps,
        "caution": caution,
    }


async def build_portfolio_ai_advice(payload: PortfolioAdvisorRequest, settings: Settings) -> dict[str, Any]:
    if settings.openai_api_key:
        try:
            return await build_portfolio_ai_with_openai(payload, settings)
        except Exception:
            # Fall back to the deterministic planner so the feature still works locally.
            return build_portfolio_ai_fallback(payload, "BudgetVest guided planning")

    return build_portfolio_ai_fallback(payload, "BudgetVest guided planning")


def build_portfolio_ai_fallback(payload: PortfolioAdvisorRequest, provider: str) -> dict[str, Any]:
    baseline = build_portfolio_plan(
        PortfolioRequest(
            initial_amount=payload.initial_amount,
            monthly_contribution=payload.monthly_contribution,
            risk_tolerance=payload.risk_tolerance,
            time_horizon=payload.time_horizon,
            primary_goal=payload.primary_goal,
            interests=payload.interests,
        )
    )

    insights = [
        {
            "title": "Cash-flow fit",
            "detail": (
                f"With monthly income around ${payload.monthly_income:,.0f} and a savings target of "
                f"${payload.savings_goal:,.0f}, your planned investment pace should stay realistic enough to repeat."
            ),
        },
        {
            "title": "Portfolio direction",
            "detail": "This starter mix keeps diversified funds at the center so your personal themes stay supportive instead of overwhelming the plan.",
        },
        {
            "title": "Starter structure",
            "detail": "This plan keeps the core diversified first, then uses your interests as a smaller supporting tilt so the portfolio stays easier to manage.",
        },
    ]
    projections = build_projection_points(
        payload.initial_amount,
        payload.monthly_contribution,
        payload.risk_tolerance,
        payload.time_horizon,
    )

    return {
        "provider": provider,
        "investor_profile": baseline["investor_profile"],
        "summary": baseline["summary"],
        "allocation": baseline["allocation"],
        "suggestions": baseline["suggestions"],
        "next_steps": baseline["next_steps"],
        "insights": insights,
        "projections": projections,
        "caution": baseline["caution"],
    }


async def build_portfolio_ai_with_openai(payload: PortfolioAdvisorRequest, settings: Settings) -> dict[str, Any]:
    schema = {
        "name": "portfolio_advice",
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "investor_profile": {"type": "string"},
                "summary": {"type": "string"},
                "allocation": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "name": {"type": "string"},
                            "percentage": {"type": "integer"},
                            "reason": {"type": "string"},
                        },
                        "required": ["name", "percentage", "reason"],
                    },
                },
                "suggestions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "category": {"type": "string"},
                            "fit": {"type": "string"},
                            "examples": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["category", "fit", "examples"],
                    },
                },
                "next_steps": {"type": "array", "items": {"type": "string"}},
                "insights": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "title": {"type": "string"},
                            "detail": {"type": "string"},
                        },
                        "required": ["title", "detail"],
                    },
                },
                "caution": {"type": "string"},
            },
            "required": [
                "investor_profile",
                "summary",
                "allocation",
                "suggestions",
                "next_steps",
                "insights",
                "caution",
            ],
        },
    }

    prompt = (
        "You are BudgetVest Portfolio AI, a practical and beginner-friendly portfolio coach for students and early investors. "
        "Build a diversified starter portfolio plan. Do not claim to provide professional financial advice. "
        "Favor broad index funds and ETFs as the foundation, then use small thematic tilts only when they fit the user's interests. "
        "Keep the tone warm, concrete, and educational. Avoid suggesting speculative trading, leverage, options, meme stocks, or concentrated single-stock bets as a core strategy. "
        "Return concise but useful reasoning for each allocation."
    )

    user_input = (
        f"Monthly income: ${payload.monthly_income:,.0f}\n"
        f"Savings goal: ${payload.savings_goal:,.0f}\n"
        f"Current amount to invest: ${payload.initial_amount:,.0f}\n"
        f"Monthly contribution: ${payload.monthly_contribution:,.0f}\n"
        f"Risk tolerance: {payload.risk_tolerance}\n"
        f"Time horizon: {payload.time_horizon}\n"
        f"Primary goal: {payload.primary_goal}\n"
        f"Interests: {', '.join(payload.interests) if payload.interests else 'none'}\n"
        f"Future plans and notes: {payload.future_plans or 'none provided'}"
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/responses",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.openai_model,
                "reasoning": {"effort": "low"},
                "input": [
                    {"role": "developer", "content": prompt},
                    {"role": "user", "content": user_input},
                ],
                "text": {
                    "format": {
                        "type": "json_schema",
                        "name": schema["name"],
                        "schema": schema["schema"],
                        "strict": True,
                    }
                },
            },
        )
        response.raise_for_status()
        payload_json = response.json()

    content_text = extract_output_text(payload_json)
    parsed = json.loads(content_text)
    projections = build_projection_points(
        payload.initial_amount,
        payload.monthly_contribution,
        payload.risk_tolerance,
        payload.time_horizon,
    )

    return {
        "provider": f"OpenAI ({settings.openai_model})",
        "investor_profile": parsed["investor_profile"],
        "summary": parsed["summary"],
        "allocation": parsed["allocation"],
        "suggestions": parsed["suggestions"],
        "next_steps": parsed["next_steps"],
        "insights": parsed["insights"],
        "projections": projections,
        "caution": parsed["caution"],
    }


async def build_portfolio_follow_up(payload: PortfolioFollowUpRequest, settings: Settings) -> dict[str, Any]:
    if settings.openai_api_key:
        try:
            return await build_portfolio_follow_up_with_openai(payload, settings)
        except Exception:
            return build_portfolio_follow_up_fallback(payload, "BudgetVest guided planning")

    return build_portfolio_follow_up_fallback(payload, "BudgetVest guided planning")


def build_portfolio_follow_up_fallback(payload: PortfolioFollowUpRequest, provider: str) -> dict[str, Any]:
    question = payload.question.lower()
    plan = payload.latest_plan
    largest_allocation = None

    if plan and plan.allocation:
        largest_allocation = sorted(plan.allocation, key=lambda item: item.percentage, reverse=True)[0]

    answer = (
        "Your current plan is trying to keep a diversified core first, then layer in personal interests in a smaller and safer way."
    )
    highlights = [
        "Broad index funds are still the main anchor for a beginner-friendly portfolio.",
        "Your risk level and time horizon matter more than chasing the most exciting theme.",
    ]
    action_items = [
        "Keep monthly contributions automatic so the plan stays consistent.",
        "Review your allocation a few times a year instead of reacting to daily swings.",
    ]

    if "aggressive" in question or "more growth" in question:
        answer = (
            "If you want a more aggressive version of this portfolio, the safest adjustment is usually to raise stock exposure gradually while keeping some diversification in place."
        )
        highlights = [
            "Higher growth usually means more equity exposure and more short-term volatility.",
            "The change should be gradual so the portfolio still matches your comfort level.",
        ]
        action_items = [
            "Increase broad stock funds first before increasing thematic tilts.",
            "Re-check whether you still have enough short-term cash outside the portfolio.",
        ]
    elif "bond" in question or "conservative" in question or "safer" in question:
        answer = (
            "The plan includes stabilizing assets because they can protect near-term goals and make it easier to stay invested when markets get rough."
        )
        highlights = [
            "More stability can reduce panic decisions during market drops.",
            "Safer allocations are especially useful when the goal is less than 10 years away.",
        ]
        action_items = [
            "Keep a clear split between investing money and near-term savings.",
            "If your timeline shortened, shift more of the plan toward lower-volatility assets.",
        ]
    elif "tech" in question or "interest" in question or "theme" in question:
        answer = (
            "You can lean harder into your interests, but it works best when those themes stay as a side allocation instead of becoming the full portfolio."
        )
        highlights = [
            "Personal-interest funds can help motivation, but concentrated themes can be more volatile.",
            "A smaller satellite position is usually a stronger beginner move than building the whole plan around one sector.",
        ]
        action_items = [
            "Cap interest-based tilts at a smaller share of the full portfolio.",
            "Keep the majority of the plan in diversified funds first.",
        ]

    if largest_allocation:
        highlights.insert(
            0,
            f"Your largest current allocation is {largest_allocation.name} at {largest_allocation.percentage}%, which is doing most of the structural work in the plan.",
        )

    return {
        "provider": provider,
        "answer": answer,
        "highlights": highlights,
        "action_items": action_items,
        "caution": "This follow-up is educational and should be used as planning guidance, not personalized financial advice.",
    }


async def build_portfolio_follow_up_with_openai(payload: PortfolioFollowUpRequest, settings: Settings) -> dict[str, Any]:
    schema = {
        "name": "portfolio_follow_up",
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "answer": {"type": "string"},
                "highlights": {"type": "array", "items": {"type": "string"}},
                "action_items": {"type": "array", "items": {"type": "string"}},
                "caution": {"type": "string"},
            },
            "required": ["answer", "highlights", "action_items", "caution"],
        },
    }

    developer_prompt = (
        "You are BudgetVest Portfolio AI, a practical beginner-friendly investing coach. "
        "Answer the user's follow-up question about their starter portfolio in a warm, clear, educational way. "
        "Do not promise returns, do not present yourself as a licensed advisor, and do not encourage speculative trading or concentrated single-stock bets as a core plan. "
        "Prefer diversified funds, goal alignment, risk awareness, and repeatable habits."
    )

    plan = payload.latest_plan or PortfolioAdvisorResponse(
        provider="BudgetVest",
        investor_profile="Starter investor",
        summary="No saved plan was provided.",
        allocation=[],
        suggestions=[],
        next_steps=[],
        insights=[],
        projections=[],
        caution="Educational planning only.",
    )
    history = "\n".join(f"{item.role}: {item.content}" for item in payload.history[-6:]) or "No previous conversation."

    user_prompt = (
        f"Profile details:\n"
        f"- Monthly income: ${payload.profile.monthly_income:,.0f}\n"
        f"- Savings goal: ${payload.profile.savings_goal:,.0f}\n"
        f"- Current amount to invest: ${payload.profile.initial_amount:,.0f}\n"
        f"- Monthly contribution: ${payload.profile.monthly_contribution:,.0f}\n"
        f"- Risk tolerance: {payload.profile.risk_tolerance}\n"
        f"- Time horizon: {payload.profile.time_horizon}\n"
        f"- Primary goal: {payload.profile.primary_goal}\n"
        f"- Interests: {', '.join(payload.profile.interests) if payload.profile.interests else 'none'}\n"
        f"- Notes: {payload.profile.future_plans or 'none provided'}\n\n"
        f"Current plan summary:\n"
        f"- Investor profile: {plan.investor_profile}\n"
        f"- Summary: {plan.summary}\n"
        f"- Allocation:\n{format_allocation_context([item.model_dump() for item in plan.allocation]) or '- none yet'}\n\n"
        f"Recent conversation:\n{history}\n\n"
        f"User question: {payload.question}"
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/responses",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.openai_model,
                "reasoning": {"effort": "low"},
                "input": [
                    {"role": "developer", "content": developer_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "text": {
                    "format": {
                        "type": "json_schema",
                        "name": schema["name"],
                        "schema": schema["schema"],
                        "strict": True,
                    }
                },
            },
        )
        response.raise_for_status()
        response_payload = response.json()

    parsed = json.loads(extract_output_text(response_payload))
    return {
        "provider": f"OpenAI ({settings.openai_model})",
        "answer": parsed["answer"],
        "highlights": parsed["highlights"],
        "action_items": parsed["action_items"],
        "caution": parsed["caution"],
    }


def extract_output_text(response_payload: dict[str, Any]) -> str:
    texts: list[str] = []

    for item in response_payload.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text" and content.get("text"):
                texts.append(content["text"])

    if texts:
        return "\n".join(texts)

    raise ValueError("OpenAI returned no text output.")


async def search_stocks(query: str, settings: Settings) -> list[dict[str, str]]:
    provider = resolve_market_provider(settings)

    if provider == "alpha_vantage":
        return await search_stocks_alpha_vantage(query, settings)
    return await search_stocks_finnhub(query, settings)


async def fetch_stock_quote(ticker: str, settings: Settings) -> dict[str, Any]:
    provider = resolve_market_provider(settings)

    if provider == "alpha_vantage":
        return await fetch_stock_quote_alpha_vantage(ticker, settings)
    return await fetch_stock_quote_finnhub(ticker, settings)


def resolve_market_provider(settings: Settings) -> str:
    provider = settings.market_data_provider
    if provider in {"finnhub", "alpha_vantage"}:
        return provider

    if settings.alpha_vantage_api_key:
        return "alpha_vantage"
    if settings.finnhub_api_key and looks_like_alpha_vantage_key(settings.finnhub_api_key):
        return "alpha_vantage"
    if settings.finnhub_api_key:
        return "finnhub"

    raise ValueError(
        "Add a market API key in backend/.env. Use ALPHA_VANTAGE_API_KEY or FINNHUB_API_KEY."
    )


def looks_like_alpha_vantage_key(api_key: str) -> bool:
    stripped = api_key.strip()
    return stripped.isalnum() and stripped.upper() == stripped and 8 <= len(stripped) <= 20


async def search_stocks_finnhub(query: str, settings: Settings) -> list[dict[str, str]]:
    if not settings.finnhub_api_key:
        raise ValueError("Add a FINNHUB_API_KEY in backend/.env to use the Finnhub market provider.")

    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.get(
            f"{FINNHUB_BASE_URL}/search",
            params={"q": query, "token": settings.finnhub_api_key},
        )
        response.raise_for_status()
        payload = response.json()

    results = payload.get("result", [])[:6]
    return [
        {
            "symbol": item.get("symbol", ""),
            "description": item.get("description", "Unknown company"),
        }
        for item in results
        if item.get("symbol")
    ]


async def search_stocks_alpha_vantage(query: str, settings: Settings) -> list[dict[str, str]]:
    api_key = settings.alpha_vantage_api_key or settings.finnhub_api_key
    if not api_key:
        raise ValueError("Add an ALPHA_VANTAGE_API_KEY in backend/.env to use the Alpha Vantage market provider.")

    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.get(
            ALPHA_VANTAGE_BASE_URL,
            params={"function": "SYMBOL_SEARCH", "keywords": query, "apikey": api_key},
        )
        response.raise_for_status()
        payload = response.json()

    alpha_error = get_alpha_vantage_error(payload)
    if alpha_error:
        raise ValueError(alpha_error)

    results = payload.get("bestMatches", [])[:6]
    return [
        {
            "symbol": item.get("1. symbol", ""),
            "description": item.get("2. name", "Unknown company"),
        }
        for item in results
        if item.get("1. symbol")
    ]


async def fetch_stock_quote_finnhub(ticker: str, settings: Settings) -> dict[str, Any]:
    if not settings.finnhub_api_key:
        raise ValueError("Add a FINNHUB_API_KEY in backend/.env to use the Finnhub market provider.")

    symbol = ticker.upper().strip()

    async with httpx.AsyncClient(timeout=12.0) as client:
        quote_response = await client.get(
            f"{FINNHUB_BASE_URL}/quote",
            params={"symbol": symbol, "token": settings.finnhub_api_key},
        )
        profile_response = await client.get(
            f"{FINNHUB_BASE_URL}/stock/profile2",
            params={"symbol": symbol, "token": settings.finnhub_api_key},
        )

        quote_response.raise_for_status()
        profile_response.raise_for_status()

    quote = quote_response.json()
    profile = profile_response.json()

    current_price = quote.get("c", 0)
    if current_price in (0, None):
        raise LookupError(f"No live quote was found for ticker '{symbol}'.")

    return {
        "company_name": profile.get("name") or symbol,
        "ticker": symbol,
        "current_price": round(float(current_price), 2),
        "daily_change": round(float(quote.get("d", 0)), 2),
        "percent_change": round(float(quote.get("dp", 0)), 2),
        "high_price": round(float(quote["h"]), 2) if quote.get("h") is not None else None,
        "low_price": round(float(quote["l"]), 2) if quote.get("l") is not None else None,
        "open_price": round(float(quote["o"]), 2) if quote.get("o") is not None else None,
        "previous_close": round(float(quote["pc"]), 2) if quote.get("pc") is not None else None,
        "exchange": profile.get("exchange"),
        "currency": profile.get("currency"),
    }


async def fetch_stock_quote_alpha_vantage(ticker: str, settings: Settings) -> dict[str, Any]:
    api_key = settings.alpha_vantage_api_key or settings.finnhub_api_key
    if not api_key:
        raise ValueError("Add an ALPHA_VANTAGE_API_KEY in backend/.env to use the Alpha Vantage market provider.")

    symbol = ticker.upper().strip()

    async with httpx.AsyncClient(timeout=12.0) as client:
        quote_response = await client.get(
            ALPHA_VANTAGE_BASE_URL,
            params={"function": "GLOBAL_QUOTE", "symbol": symbol, "apikey": api_key},
        )
        overview_response = await client.get(
            ALPHA_VANTAGE_BASE_URL,
            params={"function": "OVERVIEW", "symbol": symbol, "apikey": api_key},
        )

        quote_response.raise_for_status()
        overview_response.raise_for_status()

    quote_payload = quote_response.json()
    overview_payload = overview_response.json()

    quote_error = get_alpha_vantage_error(quote_payload)
    if quote_error:
        raise ValueError(quote_error)

    overview_error = get_alpha_vantage_error(overview_payload)
    if overview_error and not overview_payload.get("Name"):
        raise ValueError(overview_error)

    quote = quote_payload.get("Global Quote", {})
    if not quote or not quote.get("05. price"):
        raise LookupError(
            f"No live quote was returned for ticker '{symbol}'. The provider may still be activating your key, rate-limiting requests, or rejecting the symbol."
        )

    return {
        "company_name": overview_payload.get("Name") or symbol,
        "ticker": quote.get("01. symbol", symbol),
        "current_price": round(float(quote.get("05. price", 0)), 2),
        "daily_change": round(float(quote.get("09. change", 0)), 2),
        "percent_change": round(float(quote.get("10. change percent", "0").replace("%", "")), 2),
        "high_price": round(float(quote["03. high"]), 2) if quote.get("03. high") else None,
        "low_price": round(float(quote["04. low"]), 2) if quote.get("04. low") else None,
        "open_price": round(float(quote["02. open"]), 2) if quote.get("02. open") else None,
        "previous_close": round(float(quote["08. previous close"]), 2) if quote.get("08. previous close") else None,
        "exchange": overview_payload.get("Exchange"),
        "currency": overview_payload.get("Currency"),
    }
