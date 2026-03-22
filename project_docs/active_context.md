# Active Context

**Last Updated**: 2026-03-22

This document tracks the current task, recent changes, known bugs, and next steps. Update this file whenever you complete a feature, pivot tasks, or discover persistent issues.

## Current Task

**Status**: 🟡 Project Initialization

**Objective**: Set up the Memory Bank system for NITR HUB project

**Progress**:
- [x] Created CLAUDE.md with project instructions
- [x] Incorporated Memory Bank system into CLAUDE.md
- [x] Created `/project_docs/architecture.md`
- [x] Created `/project_docs/file_index.md`
- [x] Created `/project_docs/active_context.md` (this file)
- [ ] Initialize Expo project with React Native
- [ ] Set up NativeWind/Tailwind CSS
- [ ] Create base project structure (app/, src/, modules/)
- [ ] Set up Zustand stores for each module
- [ ] Implement authentication flow (Cognito + OTP)

## Recent Changes

### 2026-03-22
- **Added Memory Bank System**
  - Updated CLAUDE.md with Memory Bank workflow instructions
  - Created initial Memory Bank files in `/project_docs/`
  - Documented architecture, file structure, and active context
  - Status: ✅ Complete

## Known Bugs

*No bugs yet - project in initial setup phase*

## Next Steps

1. **Immediate**: Initialize Expo React Native project with TypeScript
2. **Phase 1**: Set up project structure and configuration
   - Install dependencies (Expo Router, NativeWind, Zustand, etc.)
   - Configure Tailwind CSS for React Native
   - Set up ESLint, Prettier, TypeScript
3. **Phase 2**: Create base navigation structure
   - Set up Expo Router file-based routing
   - Create tab navigator layout
   - Implement error boundaries for each tab
4. **Phase 3**: Implement authentication module
   - AWS Cognito integration
   - Email verification (@nitrkl.ac.in)
   - OTP flow via SES
   - Admin approval workflow
5. **Phase 4**: Build out individual modules (Hype, Campus, Quest)

## Blockers & Decisions Needed

*No blockers yet - awaiting project initialization*

## Technical Debt

*No technical debt yet - clean slate*

## Performance Notes

*No performance issues yet*

## Security Considerations

- [ ] Ensure all API calls use proper authentication tokens
- [ ] Validate @nitrkl.ac.in email domain on both client and server
- [ ] Implement rate limiting for OTP requests
- [ ] Secure gender-gated content (Q&A visibility)
- [ ] Validate admin permissions for approval/moderation actions
