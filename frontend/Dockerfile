FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./
# Copy workspace package files
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm install -w frontend

# Copy source
COPY frontend/ ./frontend/

WORKDIR /app/frontend

# Bind to all interfaces for Docker
CMD ["npm", "run", "dev", "--", "--host"]
