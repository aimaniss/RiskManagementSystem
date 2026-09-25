# Imej produksi backend RMS (Express + knex)
FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Jalankan sebagai pengguna bukan root
USER node
EXPOSE 5001

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://localhost:5001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrasi dijalankan setiap kali bermula (idempoten); matikan dengan RUN_MIGRATIONS=false
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" != \"false\" ]; then npx knex migrate:latest; fi && exec node server.js"]
