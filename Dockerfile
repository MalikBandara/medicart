FROM node:20-alpine
WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source, then build and test inside the image
COPY . .
RUN npm run build && npm test

ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.js"]
