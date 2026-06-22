# This file tells the Cloud Server how to build an environment with Python AND FFmpeg
FROM python:3.9-slim

# Install FFmpeg (Required for MP3 conversion)
RUN apt-get update && apt-get install -y ffmpeg

# Set up our application
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy our server code
COPY server.py .

# Run the server using Gunicorn (production server)
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "--timeout", "300", "server:app"]