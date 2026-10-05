---
name: production-readiness
description: Use before release/deploy or when verifying that local Docker behavior matches production.
---
# Production Readiness

A release is not ready until:
- lockfile install succeeds;
- lint and TypeScript checks pass;
- unit/integration/security tests pass;
- production Docker images build;
- Compose resolves;
- migrations succeed on a clean database;
- containers become healthy;
- smoke tests pass through exposed endpoints;
- API authorization tests pass;
- no known secrets are committed;
- environment variables are documented;
- graceful shutdown is tested;
- database persistence survives container recreation;
- backup/restore procedure is documented;
- logs are structured and useful;
- Design System checks pass for UI changes.

Prefer immutable image tags in actual deployments. Keep rollback instructions with each release.
