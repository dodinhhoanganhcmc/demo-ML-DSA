# ML-DSA demo frontend — Next.js 16 production image
# ---- build stage -------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Playwright's postinstall would download browsers we never use in the image.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_INTERNAL_URL=http://backend:8000

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- run stage ---------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    API_INTERNAL_URL=http://backend:8000 \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/public ./public

USER node
EXPOSE 3000

CMD ["npm", "run", "start"]
