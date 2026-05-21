# ─── Build stage (optional, not needed for plain Node) ───
FROM node:20-alpine AS base
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Expose port
EXPOSE 8040

# Run
CMD ["node", "server.js"]
