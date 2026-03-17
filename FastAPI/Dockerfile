FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2 and serial
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY FastAPI/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the FastAPI source code
COPY . .

# Copy necessary shared folders from the context (will be root)
# Note: These will be available if we build with context=root
# COPY localAI/ localAI/
# COPY SMS/ SMS/
# COPY systemprompt.md .

# Run the application
CMD ["uvicorn", "FastAPI.main:app", "--host", "0.0.0.0", "--port", "8000"]
