# Security Specification: SIWES LogBook ABAC & Zero-Trust Rules

## 1. Data Invariants
1. A user profile document `/users/{userId}` can only be read or written by the authenticated user whose `request.auth.uid == userId`.
2. A placement record `/users/{userId}/placement/{placementId}` belongs strictly to the user identified by `userId`.
3. A weekly entry `/users/{userId}/entries/{entryId}` and daily records `/users/{userId}/entries/{entryId}/days/{dayId}` can only be accessed or modified by `userId`.
4. Users cannot modify another student's entries, tamper with identity fields, or inject oversized arbitrary JSON payloads.
5. Path variable IDs must satisfy `isValidId(id)` (under 128 chars, alphanumeric with hyphens/underscores).

## 2. The Dirty Dozen Payloads (Rejection Matrix)
1. **Unauthenticated Read**: Attempting to read `/users/alice` without `request.auth` -> `PERMISSION_DENIED`.
2. **Cross-User Profile Read**: Bob reading `/users/alice` -> `PERMISSION_DENIED`.
3. **Cross-User Placement Injection**: Bob writing to `/users/alice/placement/active` -> `PERMISSION_DENIED`.
4. **Identity Spoofing**: Alice creating `/users/alice` with `id: "bob"` -> `PERMISSION_DENIED`.
5. **Path ID Poisoning**: Path ID containing 1KB string or special characters `../../` -> `PERMISSION_DENIED`.
6. **Shadow Fields**: Adding ghost fields like `isAdmin: true` -> `PERMISSION_DENIED`.
7. **Cross-User Entry Modification**: Bob updating `/users/alice/entries/week1` -> `PERMISSION_DENIED`.
8. **Negative Week Number**: Sending `week_number: -5` -> `PERMISSION_DENIED`.
9. **Oversized Notes (DoS attack)**: Sending 10MB string in `raw_notes` -> `PERMISSION_DENIED`.
10. **Day Text Poisoning**: Sending non-string type (e.g. object or boolean) in `day_name` or `text` -> `PERMISSION_DENIED`.
11. **Blanket Collection Query**: Unauthenticated query on `/users` -> `PERMISSION_DENIED`.
12. **Foreign Subcollection Access**: Accessing sibling's days subcollection without ownership -> `PERMISSION_DENIED`.
