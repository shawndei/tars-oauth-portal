FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build
RUN npm run build 2>/dev/null || echo "Build optional"

EXPOSE 3000

CMD ["npm", "start"]
