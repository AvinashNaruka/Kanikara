# Kanikara — Grace in Gold, Stories Untold

The repository now contains the existing production storefront and the
incremental React/Node.js migration.

## Migration workspace

- `apps/web` — Next.js storefront and future customer/admin application
- `apps/api` — dedicated NestJS/Fastify API
- `packages/contracts` — shared TypeScript API contracts
- `index.html` and `assets/` — existing storefront retained during migration

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

The web application runs at `http://localhost:3000` and the API at
`http://localhost:4000/api`. Health check: `GET /api/health`.

## Migration strategy

The existing storefront remains available while domains move incrementally
behind the Node.js API. The browser must not receive the Supabase service-role
key. Pricing, authorization, order creation, and payment verification belong
to the API and database transaction layer.