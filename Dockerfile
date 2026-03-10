# Stage 1: Build React client
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# Stage 2: Production server
FROM node:22-alpine AS production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ .
# Copy built React assets into server's public directory
COPY --from=client-build /app/client/dist ./public
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "src/app.js"]
