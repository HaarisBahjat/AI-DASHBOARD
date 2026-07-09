# ── Stage 1: Build React Frontend ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend package files and install ALL deps (including devDeps for Vite)
COPY my-app/package*.json ./
RUN npm install

# Copy frontend source and build it
# Vite outputs to ../public (relative to my-app), so we override outDir here
COPY my-app/ ./
RUN npm run build -- --outDir /built-frontend

# ── Stage 2: Production Backend ────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy backend package files and install production deps only
COPY package*.json ./
RUN npm install --omit=dev

# Copy all backend source code
COPY . .

# Bring in the compiled frontend from Stage 1 into /app/public
COPY --from=frontend-builder /built-frontend ./public

# HuggingFace Spaces requires port 7860
ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "server.js"]
