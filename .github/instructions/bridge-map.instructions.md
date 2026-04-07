---
description: Use when writing cross-stack features, checking APIs, or implementing new routes to ensure logic routing matches the established bridges map.
applyTo: "**/*.{ts,tsx,js,json}"
---

# Logic Bridges Enforcement

You are working in the NITR HUB project, which utilizes a background watcher to map all connections between the UI, State, APIs, Lambdas, and Database.

Before you make any changes that span across modules or the full stack, you MUST refer to `project_docs/logic_bridges.md`.

This ensures you:
1. Do not hallucinate API endpoints or Zustand store action names.
2. Read the existing flows before creating duplicate endpoints.
3. Consistently match frontend paths with backend handlers.

When modifying a route or database fetch:
1. Always open `project_docs/logic_bridges.md` using the exact layout mapped.
2. Verify if a method/route already handles your specific need.