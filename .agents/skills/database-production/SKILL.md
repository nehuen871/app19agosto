---
name: database-production
description: Use for PostgreSQL, Prisma schema, migrations, indexes, pooling, backup/restore and production database changes.
---
# Database Production

- Use Prisma migrations; never use `prisma db push` as the production deployment mechanism.
- Test migrations against a disposable production-like database before release.
- Back up before destructive/high-risk migrations.
- Design rollback or forward-fix strategy before deployment.
- Add indexes from actual query/filter/order patterns.
- Enforce uniqueness and referential integrity in the database.
- Avoid N+1 queries.
- Bound page sizes.
- Configure connection counts for the actual server/container limits.
- Health/readiness must not mutate data.
- Test backup restoration periodically.
- Seed data must never create default production passwords.
