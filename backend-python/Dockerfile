FROM python:3.10-slim

# Install system dependencies for OCR and Audio processing
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port for FastAPI dev/production server
EXPOSE 7860

# Run Uvicorn server, binding to all interfaces for Hugging Face/Docker compliance
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
