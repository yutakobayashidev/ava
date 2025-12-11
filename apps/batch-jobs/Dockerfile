FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build

ENV CI=true

# Copy lock file and workspace config from root
COPY pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY apps/batch-jobs/package.json /app/apps/batch-jobs/

WORKDIR /app
RUN pnpm fetch --filter @ava/batch-jobs

# Copy source code
COPY apps/batch-jobs /app/apps/batch-jobs

WORKDIR /app/apps/batch-jobs
RUN pnpm install --offline --frozen-lockfile
RUN pnpm build

FROM base

COPY --from=build /app/apps/batch-jobs/node_modules /app/node_modules
COPY --from=build /app/apps/batch-jobs/dist /app/dist
COPY --from=build /app/apps/batch-jobs/package.json /app/package.json

WORKDIR /app
CMD ["node", "dist/index.js"]
