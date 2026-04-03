# Dragon Hub

## Current State
GroupDetailPage shows the message input only when `identity && isMember` is true. `isMember` is derived from the `useGroupMembers` query. If that query is still loading (members === undefined), isMember is false and the input is hidden even for the owner or a valid member.

## Requested Changes (Diff)

### Add
- `canSendMessages` boolean: true when `isMember || isOwner`.

### Modify
- Message input visibility: use `identity && canSendMessages`.
- Join prompt: use `identity && !canSendMessages`.
- Join button: use `identity && !isMember && !isOwner`.

### Remove
- Nothing.

## Implementation Plan
1. Add `const canSendMessages = !!(isMember || isOwner)` in GroupDetailPage.tsx.
2. Replace `identity && isMember` (message input gate) with `identity && canSendMessages`.
3. Replace `identity && !isMember` (join prompt) with `identity && !canSendMessages`.
