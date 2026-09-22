# StochastoCore: Real-Time Distributed Monte Carlo Pricing & Risk Engine

StochastoCore is a production-oriented options analytics platform that combines a React trading terminal, an asynchronous FastAPI transport layer, and a native C++ Monte Carlo engine. It prices European options under geometric Brownian motion and streams live risk analytics to the browser over WebSockets.

## Architecture

```text
+-----------------+       WebSocket JSON       +----------------------+
|    React UI     | <------------------------> |  FastAPI WebSocket   |
|  Vite / Recharts|                            |     async API layer  |
+--------+--------+                            +----------+-----------+
         |                                                |
         |                                  pybind11 Zero-Copy Bridge
         |                                                |
         |                                  +---------------v-------+
         +--------------------------------> | C++20 OpenMP Engine  |
                                            | GBM / Greeks / VaR    |
                                            +-----------------------+
```

The production deployment uses one Docker container. FastAPI serves both the `/ws/simulate` WebSocket endpoint and the compiled React assets from `frontend/dist`.

## Core Features

- Multithreaded Black-Scholes path simulation using geometric Brownian motion and OpenMP.
- Thread-local `std::mt19937_64` random number generators for contention-free path generation.
- Finite-Difference Greeks: Delta, Gamma, Vega, and Theta.
- Call and put valuation with discounted expected payoffs.
- 95% and 99% terminal-price Value at Risk (VaR).
- Terminal-price density histogram for interactive frontend charting.
- Sub-20ms execution telemetry target for appropriately sized local simulations.
- 50ms frontend request debounce so slider interaction does not flood the pricing service.
- Dynamic `ws://`/`wss://` selection for local and HTTPS deployments.

## Mathematical Formulations

### Geometric Brownian Motion

The terminal underlying price is simulated as:

$$
S_T = S_0 \exp\left(\left(r - \frac{1}{2}\sigma^2\right)T + \sigma\sqrt{T}Z\right),
\qquad Z \sim \mathcal{N}(0, 1)
$$

where $S_0$ is spot, $r$ is the continuously compounded risk-free rate, $\sigma$ is annualized volatility, and $T$ is time to maturity.

The discounted European payoffs are:

$$
C = e^{-rT}\max(S_T-K, 0), \qquad P = e^{-rT}\max(K-S_T, 0)
$$

Monte Carlo prices are the sample means of these discounted payoffs.

### Finite-Difference Greeks

The engine uses common random numbers for bump-and-revalue stability. The call price is evaluated at bumped parameters and central differences are applied where possible:

$$
\Delta \approx \frac{V(S_0+h_S)-V(S_0-h_S)}{2h_S},
\qquad h_S = 0.01S_0
$$

$$
\Gamma \approx \frac{V(S_0+h_S)-2V(S_0)+V(S_0-h_S)}{h_S^2}
$$

Volatility is bumped by $h_\sigma = \max(0.0001, 0.01\sigma)$:

$$
\mathrm{Vega} \approx \frac{V(\sigma+h_\sigma)-V(\sigma-h_\sigma)}{2h_\sigma}
$$

Theta uses a one-day time bump, capped so the lower maturity remains positive. It is reported using the conventional price-decay sign:

$$
\Theta \approx \frac{V(T-h_T)-V(T+h_T)}{2h_T},
\qquad h_T = \min\left(\frac{1}{365}, \frac{T}{2}\right)
$$

The reported VaR values are spot-relative losses to the lower-tail terminal-price quantiles: $\max(0, S_0-Q_{0.05})$ and $\max(0, S_0-Q_{0.01})$.

## Performance Benchmark

The computational hot path is implemented in native C++ with OpenMP parallelism. It avoids Python-level iteration, gives each worker an independent random stream, and evaluates the base price plus finite-difference bumps in the same path loop. The pybind11 boundary transfers structured results after the native calculation rather than crossing the boundary per path.

For a representative benchmark, compare the same path count and random seed across:

1. `quant_engine.price_european_option(...)`, using the OpenMP C++ implementation.
2. A pure Python loop implementing the same GBM formula and payoff calculations.

Record wall-clock time, paths per second, and price convergence at 10K, 100K, and 500K paths. The dashboard reports native `compute_time_ms` and `simulations_per_second` from each request. Actual throughput depends on CPU topology, OpenMP thread count, container limits, and path count; benchmark numbers should therefore be recorded on the target Render instance rather than presented as universal constants.

## Run with Docker

Build and start the complete stack from the repository root:

```bash
docker compose up --build
```

The application is then available at:

- Dashboard: `http://localhost:8000/`
- WebSocket: `ws://localhost:8000/ws/simulate`

The multi-stage Docker build performs these steps:

1. Builds the Vite frontend with Node 18.
2. Compiles the pybind11 extension and installs the FastAPI dependencies with Python 3.10 and OpenMP tooling.
3. Copies only the built frontend, Python environment, native extension, and runtime libraries into the final image.

For a direct Docker workflow:

```bash
docker build -t stochastocore .
docker run --rm -p 8000:8000 stochastocore
```

## Render Deployment

Deploy the repository as a single Render Web Service using the included `Dockerfile`. Render should expose port `8000`; the container already binds Uvicorn to `0.0.0.0:8000`. No separate frontend service is required because FastAPI serves the Vite build.

The frontend derives its WebSocket URL from the browser location. Local HTTP uses `ws://`, while an HTTPS Render deployment automatically uses `wss://` against the same host.

## Project Layout

```text
core/                 Native pricing engine and pybind11 bindings
backend/              FastAPI application and Python schemas
frontend/             Vite React trading terminal
Dockerfile            Multi-stage production image
docker-compose.yml    Local single-service orchestration
```
