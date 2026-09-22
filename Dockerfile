# Stage 1: build the Vite frontend.
FROM node:18 AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: compile the pybind11 extension and install Python dependencies.
FROM python:3.10-slim AS backend-builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        g++ \
        cmake \
        libomp-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY core/ ./core/
COPY backend/ ./backend/

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r backend/requirements.txt \
    && pip install --no-cache-dir --no-build-isolation ./backend

# Stage 3: run only the application and its runtime libraries.
FROM python:3.10-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=backend-builder /usr/local /usr/local
COPY --from=backend-builder /app/backend ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
