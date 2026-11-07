# Dependency Policy — Latest Stable Only

## Rule

**Always install and maintain the latest stable versions of all packages and dependencies.**

## Implementation

### For New Dependencies
```bash
pnpm add <package>@latest    # production
pnpm add -D <package>@latest # development
```

### For Existing Dependencies
```bash
pnpm update --latest         # updates all to latest stable
pnpm update <package>@latest # updates specific package
```

### Before Every Release
1. Run `pnpm outdated` — no packages should be behind
2. Run `pnpm update --latest`
3. Run full verification: `pnpm check && pnpm test && pnpm build`
4. If breaking changes occur, document migration in CHANGELOG

### Version Pinning
- **Never** pin exact versions (`1.2.3`) in `package.json` unless a specific version is required for compatibility
- **Always** use caret ranges (`^1.2.3`) or `latest` tag
- Lockfile (`pnpm-lock.yaml`) provides reproducible builds

### Security
- Run `pnpm audit` monthly
- Apply security patches immediately via `pnpm update --latest`
- Monitor npm advisories for critical vulnerabilities

### Exceptions
Document any pinned version with:
- Package name and version
- Reason (compatibility, known bug in newer version, etc.)
- Target date for re-evaluation
- Owner responsible for monitoring

## Enforcement

- CI pipeline fails if `pnpm outdated` shows updates available (except documented exceptions)
- PR reviews must verify dependencies are current
- This policy applies to both production and development dependencies

## Current Exceptions (Documented)

| Package | Current | Latest | Reason | Re-evaluate |
|---------|---------|--------|--------|-------------|
| `eslint` | 9.39.5 | 10.13.0 | `typescript-eslint` and `eslint-config-next` not yet compatible with ESLint 10 | Q1 2026 |
| `typescript` | 5.9.3 | 7.0.2 | `typescript-eslint` not yet compatible with TypeScript 7.x | Q1 2026 |

These exceptions are temporary and must be re-evaluated by the target date. When ecosystem support lands, upgrade immediately.