# ===========================================================================
# Dockerfile — jambo-web for production.
#
# Multi-stage, same idea as jambo-api's: build with the full toolchain, then
# ship only what running the app actually needs.
#
# Next.js "standalone" output makes the final image small — it traces which
# files are genuinely imported and copies only those, instead of the whole
# node_modules folder. Requires `output: 'standalone'` in next.config.ts.
# ===========================================================================

# ---- Build stage ----------------------------------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_ variables are inlined into the client bundle AT BUILD TIME, not
# read at runtime. So the API URL has to be present here, not just in compose.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---- Production stage -----------------------------------------------------
FROM node:24-alpine AS production

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

# The standalone build carries its own minimal server plus only the modules
# it actually uses.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
