# Dragon Hub

## Current State
Dragon Hub has Videos, Marketplace, Forums, Profile. Backend has isCallerAdmin, assignCallerUserRole(principal, role), getCallerUserRole.

## Requested Changes (Diff)

### Add
- /admin route, AdminPage only accessible to admins
- User Management: input principal, select role, call assignCallerUserRole
- Admin link in Navbar dropdown when isCallerAdmin is true

### Modify
- App.tsx: add /admin route
- Navbar.tsx: show Admin link when admin

### Remove
- Nothing

## Implementation Plan
1. Create AdminPage.tsx with user role management UI
2. Update App.tsx to add admin route
3. Update Navbar.tsx to show Admin link for admins
