FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
RUN npm ci --legacy-peer-deps --workspaces --include-workspace-root 2>/dev/null || npm install --legacy-peer-deps
COPY apps/backend ./apps/backend
RUN npm run build -w apps/backend
RUN cd apps/backend && npx prisma generate

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/node_modules/.prisma ./node_modules/.prisma 2>/dev/null || true
USER app
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://localhost:3001/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
