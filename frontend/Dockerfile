# Development mode Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all application files
COPY . .

EXPOSE 3002

# Run in development mode
CMD ["npm", "run", "dev", "--", "--port", "3002"]