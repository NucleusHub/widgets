FROM node:24-alpine
RUN corepack enable pnpm
WORKDIR /app

# ── Dependency layer (cached unless lock file / package.json changes) ──
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY spotify/client/package.json ./spotify/client/
COPY spotify/server/package.json  ./spotify/server/
RUN pnpm install --frozen-lockfile

# ── Source files (hot-reload volumes override these at runtime) ──
COPY core              ./core
COPY spotify/client    ./spotify/client

EXPOSE 5176
CMD ["pnpm", "--filter", "nucleus-spotify-client", "dev"]
