# Fix Role Consistency and Resolve Users Page TypeError

The application recently introduced the `DISPENSER` role (migrated from `CASHIER`), but several frontend type definitions and components still strictly use `CASHIER`. This results in a `TypeError: Cannot read properties of undefined (reading 'some')` in `usePermissions.ts` because `ROLE_PERMISSIONS['DISPENSER']` is undefined.

## Proposed Changes

### [Frontend Types]

#### [MODIFY] [types.ts](file:///c:/Users/HP/Documents/pharmcare-pro%20offline/src/lib/types.ts)
- Add `'DISPENSER'` to `UserRole` type.
- Add `'DISPENSER'` permissions to `ROLE_PERMISSIONS` (cloning `CASHIER` permissions).

### [Frontend Hooks]

#### [MODIFY] [usePermissions.ts](file:///c:/Users/HP/Documents/pharmcare-pro%20offline/src/hooks/usePermissions.ts)
- Update checks to handle both `'CASHIER'` and `'DISPENSER'` where applicable, or standardize to one if appropriate.

### [Frontend Components]

#### [MODIFY] [Users.tsx](file:///c:/Users/HP/Documents/pharmcare-pro%20offline/src/pages/Users.tsx)
- Update statistics calculation to include/combine `CASHIER` and `DISPENSER`.
- Update role badge colors to handle `DISPENSER`.

#### [MODIFY] [AddUserDialog.tsx](file:///c:/Users/HP/Documents/pharmcare-pro%20offline/src/components/users/AddUserDialog.tsx)
- Ensure the role selection includes `DISPENSER`.

#### [MODIFY] [EditUserDialog.tsx](file:///c:/Users/HP/Documents/pharmcare-pro%20offline/src/components/users/EditUserDialog.tsx)
- Ensure the role selection includes `DISPENSER`.

## Verification Plan

### Automated Tests
- N/A (Manual verification via browser)

### Manual Verification
1. Log in as a user with the `DISPENSER` role.
2. Navigate to the Users page.
3. Verify that the page loads without crashing.
4. Verify that the user statistics correctly count both `CASHIER` (if any) and `DISPENSER` users.
5. Verify that adding/editing a user allows selecting the `DISPENSER` role.
