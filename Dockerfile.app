FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (excluding node_modules)
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/next.config.ts ./
COPY frontend/next-env.d.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/commitlint.config.ts ./
COPY frontend/eslint.config.mjs ./
COPY frontend/.env* ./

EXPOSE 3000

CMD ["pnpm", "dev"]