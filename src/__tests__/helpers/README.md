# Test Helpers

## Shared Infrastructure

### `factories.ts`
Factory functions for test data objects. Each factory accepts `overrides` to customize specific fields:
```ts
import { createMockUser } from './helpers/factories';
const user = createMockUser({ email: 'custom@test.com' });
```

### `mock-db.ts`
Complete mock Prisma client with `jest.fn()` for every model method used across the codebase.
Import `mockPrisma` and set return values per test:
```ts
import { mockPrisma } from './helpers/mock-db';
mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
```

## Naming Convention
- Unit tests: `*.service.test.ts` in domain subdirectory
- Integration tests: `*.routes.test.ts` or `*.api.test.ts` in domain subdirectory
- E2E tests: `*.e2e.test.ts` in domain subdirectory

## Test File Organization
```
src/__tests__/
  helpers/
    factories.ts
    mock-db.ts
    README.md
  auth/
    user.service.test.ts
    role.service.test.ts
    permission.service.test.ts
  embassy/
    embassy.service.test.ts
    ...
  visa/
    ...
  emergency/
    ...
  financial/
    ...
```