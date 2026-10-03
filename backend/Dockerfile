# ML-DSA demo API — Python 3.13 slim (matches the local runtime, see REPORT.md)
FROM python:3.13-slim

WORKDIR /app

# Pinned dependencies first for layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code only — tests stay out of the image (see .dockerignore).
COPY app ./app

# Non-root execution.
RUN useradd --create-home --shell /usr/sbin/nologin appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request,sys; r=urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3); sys.exit(0 if r.status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
