from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import quant_engine
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from .schemas import HistogramBucket, PricingGreeks, PricingRequest, PricingResponse

app = FastAPI(title="Monte Carlo Option Pricing API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def error_payload(error_type: str, message: str, details: Any = None) -> dict[str, Any]:
    error: dict[str, Any] = {"type": error_type, "message": message}
    if details is not None:
        error["details"] = details
    return {"error": error}


def result_to_response(result: Any, compute_time_ms: float, simulations: int) -> PricingResponse:
    histogram = [
        HistogramBucket(
            lower_bound=bucket.lower_bound,
            upper_bound=bucket.upper_bound,
            probability=bucket.probability,
            density=bucket.density,
            count=bucket.count,
        )
        for bucket in result.histogram
    ]
    simulations_per_second = simulations / (compute_time_ms / 1000.0)
    return PricingResponse(
        call_price=result.call_price,
        put_price=result.put_price,
        greeks=PricingGreeks(
            delta=result.delta,
            gamma=result.gamma,
            vega=result.vega,
            theta=result.theta,
        ),
        var_95=result.var_95,
        var_99=result.var_99,
        histogram=histogram,
        compute_time_ms=compute_time_ms,
        simulations_per_second=simulations_per_second,
    )


@app.websocket("/ws/simulate")
async def simulate(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            try:
                raw_payload = await websocket.receive_text()
                try:
                    payload = json.loads(raw_payload)
                    request = PricingRequest.model_validate(payload)
                except json.JSONDecodeError as exc:
                    await websocket.send_json(
                        error_payload("invalid_json", f"Invalid JSON payload: {exc.msg}")
                    )
                    continue
                except ValidationError as exc:
                    await websocket.send_json(
                        error_payload("validation_error", "Invalid pricing request", exc.errors())
                    )
                    continue

                params = quant_engine.OptionParams()
                params.spot = request.spot
                params.strike = request.strike
                params.time_to_maturity = request.time_to_maturity
                params.risk_free_rate = request.risk_free_rate
                params.volatility = request.volatility

                started_at = time.perf_counter()
                result = quant_engine.price_european_option(
                    params,
                    request.num_simulations,
                    request.histogram_bucket_count,
                    request.seed,
                )
                compute_time_ms = (time.perf_counter() - started_at) * 1000.0
                response = result_to_response(
                    result, compute_time_ms, request.num_simulations
                )
                await websocket.send_json(response.model_dump())
            except ValueError as exc:
                await websocket.send_json(
                    error_payload("calculation_error", str(exc))
                )
            except Exception as exc:
                await websocket.send_json(
                    error_payload("internal_error", str(exc))
                )
    except WebSocketDisconnect:
        return


FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
