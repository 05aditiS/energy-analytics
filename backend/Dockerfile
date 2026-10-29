FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies if needed and Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source code and raw data files
COPY . .

# Ensure processed data directory exists and build SQLite database from committed raw JSON data
RUN mkdir -p /app/data/processed && \
    python -m app.services.ingestion

# Expose backend API port
EXPOSE 8000

# Start FastAPI application in production mode, respecting dynamic $PORT if set by cloud hosts (e.g. Render)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
