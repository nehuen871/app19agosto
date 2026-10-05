---
name: security-testing
description: Use for authentication, authorization, security reviews, threat tests, OWASP-style API tests, dependency/container checks and sensitive endpoints.
---
# Security Testing

Security tests are mandatory for auth, users, roles, sessions, passwords, admin endpoints, uploads and notification sending.

Automate tests for:
- invalid/expired/reused email verification tokens;
- invalid/expired/reused password reset tokens;
- refresh-token rotation and revoked-session reuse;
- blocked users;
- brute-force/rate-limit behavior;
- missing/invalid auth;
- horizontal authorization (user A accessing user B);
- vertical authorization (USER -> EDITOR/ADMIN, EDITOR -> ADMIN);
- role/body parameter tampering;
- admin endpoint denial;
- mass-assignment attempts;
- malformed and oversized JSON;
- unsupported content types;
- SQL/ORM injection payload handling;
- XSS payload storage/rendering boundaries;
- CORS policy;
- security headers;
- pagination abuse and unreasonable limits;
- notification-send authorization;
- upload type/size/path handling if uploads exist;
- error responses that leak stack/secrets;
- open redirects/deep-link validation where applicable.

Production-like security run:
1. Build production images.
2. Start isolated Compose project.
3. Run migrations.
4. Run smoke tests.
5. Run API security integration suite.
6. Run dependency audit.
7. Run container/image scan when scanner is available.
8. Fail CI on agreed severity threshold.

Never perform destructive or intrusive security testing against a real production target unless explicitly authorized and scoped.
