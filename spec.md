# Dragon Hub

## Current State
Group messaging is broken — members cannot send messages in channels. The issue has persisted through multiple versions.

## Requested Changes (Diff)

### Add
- `useIsUserBannedFromGroup` hook that calls `isUserBannedFromGroup` (a public backend query, not owner-restricted) — used in GroupDetailPage to safely check if current user is banned without calling the restricted `getGroupBans`

### Modify
- **`src/frontend/src/hooks/useQueries.ts`**: Fix `useGroupBans` to wrap in try/catch and only enable when caller is the group owner (pass `isOwner` as parameter). Non-owners calling `getGroupBans` causes a backend trap that can cascade.
- **`src/frontend/src/pages/GroupDetailPage.tsx`**: 
  - Change `canSendMessages` logic: show the input for any signed-in user as long as data is still loading OR they are a member/owner. Only hide input if data has fully loaded AND they are confirmed non-member and non-owner.
  - Use `isUserBannedFromGroup` to check if current user is banned (instead of relying on the owner-only `getGroupBans`)
  - Pass `isOwner` to `useGroupBans` so it only fires for owners
- **`src/frontend/src/backend.d.ts`**: Add missing fields to `GroupMessage` (`mediaBlob`, `mediaType`, `mediaUrl`), `Group` (`bannerBlob`), and `GroupChannel` (`restricted`, `allowedMembers`)
- **`src/frontend/src/declarations/backend.did.d.ts`**: Add `restricted: boolean` and `allowedMembers: Array<Principal>` to `GroupChannel` interface
- **`src/frontend/src/declarations/backend.did.js`**: Add `'restricted': IDL.Bool` and `'allowedMembers': IDL.Vec(IDL.Principal)` to both `GroupChannel` IDL.Record definitions

### Remove
- Nothing removed

## Implementation Plan
1. Fix `backend.did.js` — add restricted/allowedMembers to both GroupChannel records
2. Fix `backend.did.d.ts` — add restricted/allowedMembers to GroupChannel interface
3. Fix `backend.d.ts` — add all missing fields
4. Fix `useGroupBans` in `useQueries.ts` — add try/catch + accept isOwner parameter to gate the query
5. Fix `GroupDetailPage.tsx` — fix canSendMessages logic with proper loading guard, call useGroupBans only for owners
