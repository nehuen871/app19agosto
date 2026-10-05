# UTN FRBA project instructions

Before modifying this project, read `.agents/skills/utn-project/SKILL.md` and `docs/especificacion_app_utnfrba_identidad_visual.md`. Apply the relevant skills from `.agents/skills/`:

- API: `backend-production`; PostgreSQL/Prisma: `database-production`.
- Containers and Compose: `docker-production`.
- Authentication, administrative endpoints and security: `security-testing`.
- UI/mobile/admin: `utn-design-system`.
- Production validation: `production-readiness`.

Use production Dockerfiles under `docker/`; the root Dockerfile mirrors the API build. Preserve production/development override separation. Run integration tests against an isolated database. Never delete database volumes without explicit authorization.

Keep changes within implemented features; do not infer authorization to implement the entire MVP from a readiness task. Report failed or unavailable checks explicitly.
