FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 4004
ENV PORT=4004 SERVICE_NAME=refunds-api
CMD ["node", "src/app.js"]