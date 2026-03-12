FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./
# Copy workspace package files
COPY backend/package.json ./backend/

# Install dependencies
RUN npm install -w backend

# Copy source code
COPY backend/ ./backend/

WORKDIR /app/backend

CMD ["npm", "start"]
