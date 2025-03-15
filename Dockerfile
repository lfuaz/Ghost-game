FROM oven/bun:1 as frontend-builder

WORKDIR /build/frontend
COPY ./frontend/package.json ./frontend/bun.lock ./
RUN bun install
COPY ./frontend .
RUN bun run build

FROM oven/bun:alpine

ENV NODE_ENV=production

WORKDIR /app
# Backend setup
COPY ./backend/package.json ./backend/bun.lock ./
RUN bun install --production
COPY ./backend .

# Copy frontend build artifacts
COPY --from=frontend-builder /build/frontend/dist ./dist

EXPOSE 3000
CMD ["bun", "start"]
