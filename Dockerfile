FROM node:22-bookworm-slim AS build
WORKDIR /app/native
COPY native/package.json native/package-lock.json ./
COPY native/scripts/build-katex-css.mjs ./scripts/
COPY native/patches/ ./patches/
RUN mkdir -p src/lib && npm ci
COPY native/ ./
RUN npm run build:web

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5183
WORKDIR /app
COPY --from=build --chown=node:node /app/native/dist ./dist
COPY --chown=node:node native/scripts/serve-web.mjs ./scripts/serve-web.mjs
USER node
EXPOSE 5183
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/serve-web.mjs"]
