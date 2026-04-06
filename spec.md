# Dragon Hub

## Current State
Dragon Hub is a full-featured platform with video sharing, marketplace (Sellers tab), forums, and Discord-style group chat. Group messaging has been broken for multiple versions despite previous fixes.

## Requested Changes (Diff)

### Add
- Optimistic message updates: messages appear immediately in the chat when sent, before backend confirmation
- Better error messages that show the actual failure reason (not just "Failed to send")

### Modify
- `AccessControl.isAdmin()`: Made safe — no longer traps for unregistered users; returns `false` instead
- `AccessControl.hasPermission()`: Made safe — treats unregistered users as guests instead of trapping
- `MixinAuthorization.getCallerUserRole()`: Made safe — returns `#guest` for unregistered users instead of trapping
- `useGroupMessages` hook: Removed `!isFetching` guard from `enabled` (was blocking queries while actor initialized), added `staleTime: 0` and `gcTime: 0` to always fetch fresh, reduced poll interval from 5s to 3s
- `usePostGroupMessage` hook: Added optimistic updates (instant display), rollback on error, `onSettled` refetch (guaranteed fresh data after any result)
- `handleSend` in GroupDetailPage: Now shows descriptive error toasts with actual error message

### Remove
- Silent failures — any error now surfaces with an actionable message

## Implementation Plan
1. Fix `access-control.mo`: Make `isAdmin` and `hasPermission` safe (no traps for unregistered users)
2. Fix `MixinAuthorization.mo`: Make `getCallerUserRole` safe
3. Fix `useGroupMessages` in `useQueries.ts`: Remove isFetching dependency, add staleTime/gcTime 0
4. Fix `usePostGroupMessage` in `useQueries.ts`: Add optimistic updates, onError rollback, onSettled refetch
5. Fix `handleSend` in GroupDetailPage: Better error handling
