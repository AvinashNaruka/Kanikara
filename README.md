# Kanikara — Grace in Gold, Stories Untold

Jewellery storefront and admin application. This repository is the production codebase: a Next.js web app, a NestJS API, and shared contracts.

## Workspace

- `apps/web` — Next.js storefront and admin
- `apps/api` — NestJS/Fastify API
- `packages/contracts` — shared TypeScript API contracts

## Requirements

- Node.js 22.22.3 or newer
- npm 11 or newer

## Local development

Copy the environment templates:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Set the Supabase URL and anon key in both env files. Put the service-role key only in `apps/api/.env`. Then install and run:

```powershell
npm install
npm run dev:api
npm run dev:web
```

The web application runs at `http://localhost:3000` and the API at `http://localhost:4000/api`. Health check: `GET /api/health`.

The browser must not receive the Supabase service-role key. Pricing, authorization, order creation, and payment verification belong to the API and database transaction layer.
