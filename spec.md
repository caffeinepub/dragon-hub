# Dragon Hub

## Current State
Shops can be created by any authenticated user. The frontend shows the "Create Shop" button to all signed-in users regardless of their role.

## Requested Changes (Diff)

### Add
- Backend: `isCallerCreatorOrAdmin` query function so the frontend can check permissions

### Modify
- Backend: `createShop` should use `isCreatorOrAdmin` check instead of the generic `hasPermission` user check
- Frontend: `ShopsPage` should only show the "Create Shop" button to users who are admin or creator

### Remove
- Nothing removed

## Implementation Plan
1. Add `isCallerCreatorOrAdmin` public query to main.mo
2. Update `createShop` in main.mo to use `isCreatorOrAdmin` guard
3. Add `isCallerCreatorOrAdmin` to backend.d.ts
4. Add `useIsCreatorOrAdmin` hook in useQueries.ts
5. Update ShopsPage.tsx to check `isCreatorOrAdmin` before showing the Create Shop button
