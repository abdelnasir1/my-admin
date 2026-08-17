# ---------- Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the code
COPY . .

# Build the app
RUN npm run build

# ---------- Production stage ----------
FROM node:20-alpine

WORKDIR /app

# Lightweight static server with SPA support
RUN npm install -g serve

# Copy only the built files
COPY --from=builder /app/dist ./dist

# The port the container will listen on
EXPOSE 3000

# -s = SPA mode (all routes → index.html)
CMD ["serve", "-s", "dist", "-l", "3000"]
