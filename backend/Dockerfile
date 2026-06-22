FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install dependencies then copy project
COPY requirements.txt ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev curl \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn \
    && apt-get remove -y gcc curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY . .

ENV FLASK_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000

EXPOSE 5000

# Run the app with Gunicorn using the factory app:create_app()
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "app:create_app()"]
