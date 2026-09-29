# Production mode Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all application files
COPY . .

# Build-time public config only — Next.js inlines NEXT_PUBLIC_* into the client
# bundle. Real secrets are NOT baked in; they arrive at runtime via compose env_file.
ARG NEXT_PUBLIC_API_URL=https://bookmarks.ishankoradia.in/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Runtime env (NextAuth secrets, Google creds, etc.) is injected by docker-compose
# `env_file: ./frontend/.env.prod` on the server — never copied into the image, so
# published images stay secret-free.

EXPOSE 3002

# Run in production mode
CMD ["npm", "run", "start", "--", "--port", "3002"]
