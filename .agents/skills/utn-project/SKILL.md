---
name: utn-project
description: Use for any change to the UTN FRBA mobile, admin or API project. Coordinates architecture, production, security and design rules.
---
# UTN Project Orchestrator

Before coding, read `docs/especificacion_app_utnfrba_identidad_visual.md`.

Route work to the relevant project skills:
- UI/mobile/admin -> `utn-design-system`
- Mobile screen usability/layout -> `expo-native-ui`
- Mobile navigation -> `expo-router`
- Mobile loading, errors, offline, caching and saves -> `expo-data-fetching`
- Mobile gestures, transitions and motion -> `expo-animation`
- Docker/Compose -> `docker-production`
- Express/API -> `backend-production`
- Prisma/PostgreSQL -> `database-production`
- Auth/permissions/security -> `security-testing`
- Release/readiness -> `production-readiness`

Rules:
1. Production-first: compilation alone is never Definition of Done.
2. Keep mobile, admin and API boundaries clear.
3. Reuse shared types, validation and design tokens.
4. Prefer stable dependencies; no beta/RC without explicit approval.
5. Do not silently broaden task scope.
6. Expo skills complement the project design system for `apps/mobile` only. The specification and `utn-design-system` take precedence for brand, typography, tokens and component reuse. Preserve the shared API client and TanStack Query architecture. Check installed SDK compatibility and existing solutions before adopting suggested libraries. Referenced skills/packages may not be installed; do not add them automatically. External feedback requires explicit user authorization.
