FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY tools/media/service/requirements.txt /app/requirements.txt
RUN python3 -m venv /opt/video-venv && /opt/video-venv/bin/pip install --no-cache-dir -r /app/requirements.txt
COPY tools/media/service /app/tools/media/service
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/video-browsers
RUN npm --prefix tools/media/service ci --omit=dev && tools/media/service/node_modules/.bin/playwright install --with-deps chromium && chmod -R a+rX /opt/video-browsers
COPY tools/media/scripts/video-platforms.mjs tools/media/scripts/bilibili-url.mjs /app/tools/media/scripts/
ENV VIDEO_PYTHON=/opt/video-venv/bin/python VIDEO_HOST=0.0.0.0 PORT=8795
RUN mkdir -p /app/.local-tools/video-cache && chown -R node:node /app/.local-tools
USER node
EXPOSE 8795
CMD ["node", "tools/media/service/video-service.mjs"]
