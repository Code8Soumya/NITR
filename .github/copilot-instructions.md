# NITR HUB - Project Context & Copilot Instructions

## Memory Bank System
This project operates using a "Memory Bank" system to preserve project context across sessions. All memory files are located in `/project_docs/`.

### Mandatory Initialization
Before executing any new task, starting a feature, or debugging, review the following files to establish context:
* `/project_docs/architecture.md` - Tech stack, database schema, navigation map
* `/project_docs/database_design.md` - Detailed database schema architecture, relationship mapping, and constraints
* `/project_docs/file_index.md` - Directory map and file descriptions
* `/project_docs/active_context.md` - Current task, recent changes, and known bugs

### Continuous Maintenance
Keep the Memory Bank highly accurate and deeply detailed to ensure future sessions fully understand the context. Update relevant files in `/project_docs/` BEFORE completing a response when:
* **File Changes**: Creating, deleting, or significantly modifying files → update `file_index.md` with detailed descriptions of what the file does, its dependencies, and export structures.
* **Architecture Changes**: Installing dependencies, changing state management, or altering navigation → update `architecture.md` with explicit reasoning behind these decisions and how they affect the rest of the application.
* **Context Shifts**: Completing features, pivoting tasks, or discovering persistent bugs → update `active_context.md` with comprehensive logs of steps taken, exact bug symptoms, root causes, and how issues were completely resolved.
* **Database Changes**: Modifying database schemas, changing column types, adding indexes, or introducing new tables → update `database_design.md` with explicit schema details, constraints, relationships, and exactly how API requests interact with these tables.

## Project Overview
NITR HUB is a campus social application for NIT Rourkela students. The app has three independent tabs:
1. **Tab 1: Social Media (Hype Feed)** - Posts, hypes (likes), comments, hashtags
2. **Tab 2: Campus Utilities (Q&A + Lost & Found)** - Combined feature with gender-filtered sub-tabs (Boys/Girls/General)
3. **Tab 3: Daily Quest** - 1-on-1 AI-matched peer chat (30 messages threshold)

## Tech Stack
- **Frontend**: React Native with Expo Router, NativeWind (Tailwind), Zustand
- **Backend / DB**: AWS Lambda + API Gateway, Aurora PostgreSQL
- **Auth & Storage**: AWS Cognito + SES, S3 + CloudFront CDN

## Architecture Principles
* **Module Isolation**: Each tab operates independently with its own Zustand store. Each tab is wrapped in an ErrorBoundary component ensuring fault tolerance.
* **Gender-Normalized Leaderboard**: Three leaderboards (Boys, Girls, General). General uses a Z-score + percentile hybrid formula.

## Development Constraints & Rules
- Always output clean, modular code following the isolated module structure (`src/modules/[name]/`).
- Follow the established database schema (Auth, Gamification, Social, Campus, Quest, AI) when generating backend queries.
- Ensure WebSocket implementations align with AppSync and real-time subscription best practices.
- Never ask the user for permission to read or update the Memory Bank. Treat it as an integrated part of the workflow.

## UI/UX Design System Workflow (REQUIRED for all UI creation/updates)
When building or updating UI/UX components:
1. Always consult the Design System Master file (`design-system/nitr-hub/MASTER.md`) for typography, colors, padding conventions, patterns, and anti-patterns.
2. Check for page-specific overrides in `design-system/nitr-hub/pages/<page-name>.md`.
3. If new rules, typography choices, or domains are needed, execute the UI Pro Max scripts (e.g. `python3 .github/prompts/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist`) and update the MASTER.md file accordingly before coding.
4. Auto-update the `MASTER.md` file if you generate new standard UI rules for the app.

## Automated Agent Customization (Self-Learning Workflow)
To automatically manage the project moving forward, you must autonomously create and maintain agent customizations (`.instructions.md`, `.prompt.md`, `SKILL.md`) when you encounter repeated patterns, complex domains, or dedicated workflows:
* **Instructions (`.github/instructions/*.instructions.md`)**: Whenever a new domain constraint, project-wide convention, or architectural pattern is established (e.g., a specific way we handle React Native styles, DB schema rules, or Zustand state), create an instructions file with an appropriate `applyTo` glob pattern so it is automatically selected for those files.
* **Skills (`.github/skills/[name]/SKILL.md`)**: Whenever you solve a complex, multi-step problem that is likely to recur (e.g., generating new API routes with AWS Lambda and AppSync configurations, or migrating the Aurora PostgreSQL database), extract the steps and generate a new skill folder with a `SKILL.md`. Document the exact tool sequence needed.
* **Prompts (`.github/prompts/*.prompt.md`)**: Whenever a specific, repetitive single-focus task emerges (e.g., "Scaffold a new tab module", or "Generate a Bedrock AI embedding script"), create a reusable prompt template.
* **Auto-selection criteria**: Always ensure the `description` field in the generated YAML frontmatter is highly specific (e.g., includes "Use when: ...") so these customizations get auto-selected precisely when needed in future conversations.






