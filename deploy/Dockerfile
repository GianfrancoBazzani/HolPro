# Stage 1: Build
FROM cgr.dev/chainguard/node:latest-dev AS build

USER root
RUN apk add --no-cache ca-certificates

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /holpro

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json packages/db/
COPY packages/web-app/package.json packages/web-app/
RUN pnpm install --frozen-lockfile

COPY packages/db packages/db
COPY packages/web-app packages/web-app

# Placeholders only. The build never contacts these services, but the
# application guards reject an empty value when NODE_ENV is production.
ENV MCP_TOKEN_SECRET=YnVpbGQtb25seS1wbGFjZWhvbGRlci1ub3QtYS1yZWFsLWtleQ==
ENV OPENAI_API_KEY=build-placeholder
ENV RESEND_API_KEY=build-placeholder
ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/build
ENV BETTER_AUTH_URL=http://build-placeholder.invalid
RUN pnpm run build

# Stage 2: Runtime
FROM cgr.dev/chainguard/node:latest-dev

USER root
RUN apk add --no-cache ca-certificates libcap-utils
RUN setcap 'cap_net_bind_service=+ep' "$(readlink -f /usr/bin/node)"

WORKDIR /holpro

COPY --from=build /holpro/packages/web-app/.next/standalone ./
COPY --from=build /holpro/packages/web-app/.next/static ./packages/web-app/.next/static
COPY --from=build /holpro/packages/web-app/public ./packages/web-app/public
COPY --from=build /holpro/packages/web-app/mastra/workspace ./packages/web-app/mastra/workspace

RUN chown -R 65532:65532 /holpro

USER 65532:65532

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

CMD ["packages/web-app/server.js"]
