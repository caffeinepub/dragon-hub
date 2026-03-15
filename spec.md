# Dragon Hub

## Current State
Full platform with Videos, Marketplace, Shops, Forums, Groups, Admin. Authorization uses admin/user/guest roles. Admin bootstrap is broken: the claim button sends hardcoded token that never matches env var. getUserRole traps for unregistered users causing isCallerAdmin to throw.

## Requested Changes (Diff)

### Add
- creator role (between admin and user)
- claimFirstAdmin() backend: claim admin only when no admin exists, no token needed
- Creator permissions: manage own content
- Admin permissions: full control

### Modify
- getUserRole returns guest instead of trapping for unregistered users
- Claim Admin button calls claimFirstAdmin()
- Role dropdowns include Admin, Creator, User, Guest
- Forum category creation: allow creators too

### Remove
- Hardcoded init secret from frontend

## Implementation Plan
1. Modify access-control.mo: add creator role, claimFirstAdmin, fix getUserRole
2. Modify MixinAuthorization.mo: expose claimFirstAdmin
3. Update main.mo: creator permissions, admin can delete all content
4. Update AdminPage.tsx: use claimFirstAdmin, add Creator role option
5. Validate and deploy
