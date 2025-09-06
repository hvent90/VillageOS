# Stage 1: Build Stage
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Stage
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force
COPY --from=builder /usr/src/app/dist ./dist
# Copy Prisma schema and generated client
COPY prisma ./prisma
COPY --from=builder /usr/src/app/node_modules ./node_modules
CMD ["npm", "start"]
