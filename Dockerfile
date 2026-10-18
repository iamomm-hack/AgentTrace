FROM node:24.22.0-bookworm-slim AS build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM node:24.22.0-bookworm-slim

WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV AGENTTRACE_DB_PATH=./data/agenttrace.sqlite
ENV AGENTTRACE_FRONTEND_DIR=../frontend

COPY --from=build /app/backend/package.json /app/backend/package-lock.json ./
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/migrations ./migrations
COPY --from=build /app/frontend/dist /app/frontend
RUN mkdir -p data

EXPOSE 3000
CMD ["node", "dist/index.js"]
