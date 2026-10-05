---
name: backend-production
description: Use for Express, Node.js API architecture, production performance, errors, logging, health endpoints and graceful shutdown.
---
# Backend Production

Express rules:
- Central validation and error middleware.
- Helmet and explicit CORS.
- Request/body size limits.
- Rate limit auth and sensitive routes.
- Structured logs with request/correlation ID.
- Never log passwords, reset tokens, access tokens or refresh tokens.
- `/health/live` proves process liveness.
- `/health/ready` proves required dependencies are ready.
- Respect reverse proxy configuration intentionally; do not blindly enable `trust proxy`.
- Gracefully stop accepting requests on SIGTERM, finish in-flight work, disconnect Prisma and exit.
- Avoid synchronous CPU-heavy work in request handlers.
- Paginate collection endpoints.
- Validate environment variables at startup and fail fast.
- Production errors must not expose stack traces.
