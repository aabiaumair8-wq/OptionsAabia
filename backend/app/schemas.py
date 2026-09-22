from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class PricingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    spot: float = Field(gt=0, description="Current underlying spot price")
    strike: float = Field(gt=0, description="Option strike price")
    time_to_maturity: float = Field(gt=0, description="Time to maturity in years")
    risk_free_rate: float = Field(description="Continuously compounded annual rate")
    volatility: float = Field(gt=0, description="Annualized volatility")
    num_simulations: int = Field(default=100_000, gt=0)
    histogram_bucket_count: int = Field(default=50, gt=0, le=1_000)
    seed: int = Field(default=42, ge=0)


class HistogramBucket(BaseModel):
    lower_bound: float
    upper_bound: float
    probability: float
    density: float
    count: int = Field(ge=0)


class PricingGreeks(BaseModel):
    delta: float
    gamma: float
    vega: float
    theta: float


class PricingResponse(BaseModel):
    call_price: float
    put_price: float
    greeks: PricingGreeks
    var_95: float
    var_99: float
    histogram: list[HistogramBucket]
    compute_time_ms: float = Field(ge=0)
    simulations_per_second: float = Field(ge=0)
