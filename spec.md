# Dragon Hub

## Current State

Dragon Hub is a full-stack platform with video sharing, marketplace, forums, and Discord-style group chat. Previous versions fixed multiple Candid type mismatches and admin claim logic. Two critical issues remain reported by the user:

1. Admin panel doesn't work (user cannot claim admin or access the panel)
2. Group members cannot send messages in channels

## Requested Changes (Diff)

### Add
- Auto-registration of callers in `joinGroup` (adds them to `userRoles` as `#user` if not present)
- Auto-registration of callers in `postGroupMessage` (same)
- Group membership check in `postGroupMessage` replacing the `hasPermission` check

### Modify
- `MixinAuthorization.mo`: `isCallerAdmin` now uses a safe direct map lookup instead of calling `getUserRole` (which traps for unregistered users). This was the root cause of the admin panel failure.
- `main.mo` `postGroupMessage`: replaced `AccessControl.hasPermission(caller, #user)` (which called `getUserRole` and trapped for unregistered callers) with a direct group membership check. Any member or owner of the group can post.
- `main.mo` `joinGroup`: now auto-registers the caller in `userRoles` so subsequent backend calls that check `hasPermission` work correctly.

### Remove
- Nothing removed

## Implementation Plan

1. Fix `isCallerAdmin` in `MixinAuthorization.mo` to do a safe map lookup instead of calling `getUserRole` — prevents trap for users not in the role map.
2. Fix `joinGroup` in `main.mo` to auto-register caller as `#user` if not already registered.
3. Fix `postGroupMessage` in `main.mo` to check group membership directly (instead of `hasPermission`) and also auto-register the caller.
4. No frontend changes needed — the UI logic was already correct.
