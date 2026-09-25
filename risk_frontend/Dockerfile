# Peringkat 1: bina SPA
FROM node:22-bookworm-slim AS bina
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Nilai awam sahaja (dibundel ke JS). Lalai "/api" = melalui proxy nginx di bawah.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Peringkat 2: sajikan dengan nginx + proxy /api ke backend
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=bina /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -q -O /dev/null http://localhost/ || exit 1
