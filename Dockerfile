FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@10.28.2 && pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
ARG EXPO_PUBLIC_ROBLE_BASE_URL
ARG EXPO_PUBLIC_ROBLE_CONTRACT_ID
ARG EXPO_PUBLIC_GUEST_EMAIL
ARG EXPO_PUBLIC_GUEST_PASSWORD
ENV EXPO_PUBLIC_ROBLE_BASE_URL=${EXPO_PUBLIC_ROBLE_BASE_URL} \
    EXPO_PUBLIC_ROBLE_CONTRACT_ID=${EXPO_PUBLIC_ROBLE_CONTRACT_ID} \
    EXPO_PUBLIC_GUEST_EMAIL=${EXPO_PUBLIC_GUEST_EMAIL} \
    EXPO_PUBLIC_GUEST_PASSWORD=${EXPO_PUBLIC_GUEST_PASSWORD}
# The container serves a client-side web export, including dynamic routes.
RUN node -e "const fs = require('node:fs'); const config = JSON.parse(fs.readFileSync('app.json', 'utf8')); config.expo.web.output = 'single'; fs.writeFileSync('app.json', JSON.stringify(config));" \
    && pnpm exec expo export --platform web

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 80
