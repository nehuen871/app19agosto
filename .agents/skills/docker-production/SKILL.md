---
name: docker-production
description: Use for Dockerfiles, Docker Compose, local production emulation, container hardening, healthchecks, networking, secrets, builds and deployment.
---
# Docker Production

Prefer the official Docker skills (`docker/skills`) when installed, especially project foundations, build strategies and compose patterns.

Requirements:
1. Multi-stage builds.
2. Pin intentional runtime major versions and use lockfiles.
3. Run application containers as non-root.
4. Keep build tools out of runtime images.
5. Add `.dockerignore`.
6. Add healthchecks for API, admin and database readiness where appropriate.
7. `depends_on` is not readiness: combine it with healthchecks.
8. Never use `sleep` as service readiness logic.
9. Use service DNS names inside Compose (`db:5432`), never container IPs.
10. Named volumes for persistent database state.
11. Do not bake secrets into images.
12. Use read-only filesystem where practical and tmpfs for writable temporary paths when compatible.
13. Drop unnecessary Linux capabilities; do not use privileged containers.
14. Handle SIGTERM and graceful shutdown.
15. Production-like local mode must run the same production image/build command used for deployment.
16. Validate Compose with `docker compose config --quiet`.
17. Verify runtime using `docker compose ps`, health state and smoke tests.
18. Never run `docker compose down -v` without explicit destructive-data approval.

Local parity:
- `compose.yaml`: common production-shaped topology.
- `compose.dev.yaml`: development-only bind mounts/watch/debug.
- `compose.prod-local.yaml`: local production emulation, no hot reload.
- Production must select overrides explicitly.

Security scanning gates should include dependency audit, image vulnerability scan where available, secret scanning and application security tests.
