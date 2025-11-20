# ==========================================
# Stage 1: Frontend Builder
# ==========================================
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY public/ ./public/
COPY src/ ./src/
COPY tailwind.config.js postcss.config.js ./
COPY .env ./

# Build React application
RUN npm run build

# ==========================================
# Stage 2: Backend Runtime
# ==========================================
FROM python:3.11-slim

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libgomp1 \
        libgl1 \
        postgresql-client \
        curl \
        build-essential \
        libpq-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Set working directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements-onnx.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements-onnx.txt && \
    rm -rf /root/.cache/pip /tmp/*

# Copy application code
COPY app/ ./app/

# Copy YOLO ONNX model
COPY best.onnx ./best.onnx

# Copy React build from Stage 1
COPY --from=builder /app/build ./build

# Create uploads directories
RUN mkdir -p /tmp/uploads/originals /tmp/uploads/annotated /tmp/uploads/thumbnails && \
    chmod -R 755 /tmp/uploads

# Expose the port Railway will provide via $PORT
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start FastAPI app
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
