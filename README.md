This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Deployment

This app is Docker-ready for Dokploy and similar VPS platforms.

- Image builds run `prisma generate` before `next build`.
- Container startup runs `prisma migrate deploy` automatically when `RUN_DB_MIGRATIONS=true`.
- `DATABASE_URL` is only required at runtime, not during the image build.
- `.github/workflows/docker-build.yml` builds the Docker image automatically on every push and pull request.

Recommended Dokploy environment variables:

```env
DATABASE_URL="paste-your-prisma-postgres-connection-string-here"
NEXT_PUBLIC_SITE_URL="https://www.pngoswa.org"
RUN_DB_MIGRATIONS="true"
RESEND_API_KEY=""
UPLOADTHING_TOKEN=""
```

For a single Dokploy instance, leaving `RUN_DB_MIGRATIONS=true` is the simplest setup. If you later scale to multiple replicas, run `prisma migrate deploy` once as a pre-deploy step and set `RUN_DB_MIGRATIONS=false` on the app container to avoid concurrent migration runs.

## Prisma Postgres

This project is configured to use a managed Prisma Postgres database. Set your Prisma Postgres connection string in `.env`:

```env
DATABASE_URL="paste-your-prisma-postgres-connection-string-here"
```

Then run migrations and generate the client:

```bash
pnpm run db:migrate:dev -- --name init
pnpm db:generate
```

## Local Compose

To run the app container locally:

```bash
pnpm docker:up
```

This uses `docker-compose.yml`, builds the app image, connects to the Prisma Postgres database from your `.env`, runs `prisma migrate deploy` on container startup, and serves the site at `http://localhost:3000`.

To open Prisma Studio too:

```bash
docker compose --profile tools up --build -d
```

Prisma Studio will then be available at `http://localhost:5555`.

## Dokploy

For fully automatic VPS deploys on push:

1. Connect this repository to Dokploy.
2. Use the included `Dockerfile`.
3. Enable Dokploy auto-deploy or webhook deploys for your branch.
4. Set the required environment variables in Dokploy, especially `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `RUN_DB_MIGRATIONS`, `RESEND_API_KEY`, and `UPLOADTHING_TOKEN`.

With that setup, each push can trigger a fresh Docker build in Dokploy, and the new container will apply Prisma migrations before starting.

For production, set `NEXT_PUBLIC_SITE_URL` to `https://www.pngoswa.org`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
