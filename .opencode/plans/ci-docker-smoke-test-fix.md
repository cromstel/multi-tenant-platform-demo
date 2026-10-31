# Fix the CI Docker smoke test and the build-time `NEXT_PUBLIC_ROOT_DOMAIN`

## Goal

Make the `docker` job in `.github/workflows/ci.yml` pass, without weakening the
production store guard, and stop built images from shipping `localhost` in the
client bundle when a real domain is configured.

Two defects, one changeset. Both are pre-existing on `main` (commit `1f677f8`).

## Verified context

Read from the code, not assumed:

| Evidence | Consequence |
| --- | --- |
| `Dockerfile:40` sets `NODE_ENV=production` | The runtime is a production process |
| `lib/redis.ts:32-43` throws at **module evaluation** when production, not build phase, no Upstash, no MySQL | Importing the module aborts; there is no degraded fallback |
| `ci.yml:105-109` runs the container with only `ADMIN_*` | `hasMySQL` is false and `hasUpstashCredentials()` is false, so the guard throws |
| `app/api/health/route.ts:3` imports `storageDriver` from `lib/redis` | The throw fires inside the route → **500**, not the intended 503 |
| `ci.yml:113` uses `curl -sf … \| grep -q '"service"'` | `-f` fails on any non-2xx, so even a configured store would fail on the expected 503 |
| `ci.yml:111-112` comment says a degraded response is expected | The assertion contradicts the step's own stated intent |
| `next/dist/build/index.js:1232` sets `NEXT_PHASE=phase-production-build` | The `verify` job's `Build` step is safe — no guard change needed there |
| `proxy.ts:39-51` treats `127.0.0.1` as the root host | A page assertion from `127.0.0.1` will not be rewritten to a tenant route |
| `lib/db/mysql.ts:166-178` clears `schemaPromise` on failure | The health check fails fast on `ECONNREFUSED` and can retry |
| `app/subdomain-form.tsx:34`, `app/auth/register/form.tsx:30,60` import `rootDomain` in `'use client'` components | `NEXT_PUBLIC_ROOT_DOMAIN` is **inlined at build time**, so a runtime-only env var cannot fix the client bundle |
| `.dockerignore:12-16` excludes `.env*` | The image build never sees local env; a build `ARG` is the only way to set the value |

## Decisions

1. **Keep the fail-fast guard in `lib/redis.ts`.** It is a deliberate production
   safety net: a container with no durable store must not silently run on the
   local file store. Rejected alternative: lazily importing or try/catching
   around it, which would let a misconfigured production container serve
   traffic with throwaway state.
2. **Satisfy the guard in the smoke test with `MYSQL_HOST` + `MYSQL_DATABASE`.**
   Nothing listens on 3306 in that job, so the health endpoint answers
   `503 degraded` — exactly the documented contract, and now reachable.
3. **Assert the envelope and the selected driver, not the health verdict.**
   `storage == "mysql"` is the assertion that would catch a silent fallback; the
   status code only proves the route loaded.
4. **Do not run MySQL in the docker job.** `docker-compose.yml` already
   exercises the full stack with a real database; adding a service here doubles
   wall-clock time to test a path that is already covered.
5. **Pass `NEXT_PUBLIC_ROOT_DOMAIN` as a build arg** from the Dockerfile, compose
   and CI. Runtime env alone cannot fix values inlined into client chunks.

## Tasks

- [ ] **1. Fix the smoke test step** in `.github/workflows/ci.yml` (replace lines
      103-114 with the block below).

      ```yaml
            - name: Smoke test the image
              timeout-minutes: 5
              run: |
                set -euo pipefail

                # Always surface the container log and clean up, whether the
                # test passes or fails — a silent exit is the least useful outcome.
                trap 'status=$?; if [ "$status" -ne 0 ]; then docker logs app 2>&1 || true; fi; docker rm -f app >/dev/null 2>&1 || true' EXIT

                # `lib/redis.ts` refuses to run in production without a durable
                # store, and the runtime image sets NODE_ENV=production. MYSQL_*
                # is the cheapest way to satisfy that guard: nothing listens on
                # 3306 here, so the health endpoint is expected to be `degraded`.
                docker run -d --name app -p 3030:3030 \
                  -e MYSQL_HOST=127.0.0.1 \
                  -e MYSQL_DATABASE=multi_tenant \
                  -e ADMIN_SESSION_SECRET=ci-only-admin-session-secret-32-characters-min \
                  -e ADMIN_EMAIL=admin@ci.local \
                  -e ADMIN_PASSWORD=ci-only-admin-password \
                  citgroup-tenancy-system:ci

                # 503 is a valid answer: it proves the route loaded and reported
                # its dependency state instead of failing to boot. A missing
                # store used to return 500 here, which is the regression this
                # step guards against.
                code=000
                for attempt in $(seq 1 45); do
                  code=$(curl -sS -o /tmp/health.json -w '%{http_code}' \
                    http://127.0.0.1:3030/api/health || true)
                  if [ "$code" != "000" ]; then break; fi
                  sleep 2
                done

                echo "health status: $code"
                cat /tmp/health.json

                case "$code" in
                  200|503) ;;
                  *) echo "unexpected health status: $code" >&2; exit 1 ;;
                esac

                # `mysql` proves the production guard was satisfied by
                # configuration rather than silently falling back.
                jq -e '.service == "citgroup-tenancy-system" and .storage == "mysql"' /tmp/health.json

                # The Next runtime, the proxy and RSC rendering have to work
                # too — a passing JSON route alone would not catch a broken page.
                for path in / /auth/login; do
                  page=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3030$path")
                  echo "GET $path -> $page"
                  [ "$page" = "200" ] || exit 1
                done
      ```

- [ ] **2. Add a timeout to the docker job** — under `runs-on: ubuntu-latest`
      in the `docker` job, add `timeout-minutes: 20` so a hung boot cannot burn
      the default six-hour limit.

- [ ] **3. Pass the build arg from CI** — in the `Build image` step's `with:`
      block (`ci.yml:95-101`), add:

      ```yaml
                build-args: |
                  NEXT_PUBLIC_ROOT_DOMAIN=localhost:3030
      ```

- [ ] **4. Declare the arg in the Dockerfile** — in the `build` stage
      (`Dockerfile:23-34`), after `RUN corepack enable` and before `COPY --from=deps`:

      ```dockerfile
      # `NEXT_PUBLIC_*` values are inlined into the client bundle at build time,
      # so they cannot be fixed with a runtime env var. This has to match the
      # domain the app is served from, or client-rendered tenant URLs fall back
      # to `localhost`. `.dockerignore` excludes `.env*`, so this is the only
      # channel into the build.
      ARG NEXT_PUBLIC_ROOT_DOMAIN=localhost:3030
      ENV NEXT_PUBLIC_ROOT_DOMAIN=$NEXT_PUBLIC_ROOT_DOMAIN
      ```

- [ ] **5. Pass the build arg from compose** — in `docker-compose.yml`, extend the
      `app.build` block (lines 34-36):

      ```yaml
          build:
            context: .
            dockerfile: Dockerfile
            args:
              # Client components inline this at build time; the runtime env
              # below covers server rendering. Both have to agree.
              NEXT_PUBLIC_ROOT_DOMAIN: ${NEXT_PUBLIC_ROOT_DOMAIN:-localhost:3030}
      ```

- [ ] **6. Verify locally** (see below), commit, push, then confirm the Actions
      run in the GitHub UI — `gh` is not installed.

## Validation

Must be clean before commit:

1. `pnpm check` (tsc + eslint)
2. `pnpm test` — expect 64 passed, 5 files
3. `pnpm build`
4. If Docker is available:
   - `docker compose build`
   - `docker compose up -d --build --wait` — `--wait` gates on the image's own
     healthcheck, so a healthy exit proves the container reached MySQL
   - `curl -s http://localhost:3030/api/health | jq '{ok, status, storage}'` →
     `{"ok": true, "status": "healthy", "storage": "mysql"}`
   - prove the build arg reached the client bundle:
     `NEXT_PUBLIC_ROOT_DOMAIN=tenancy.example.test docker compose build` then
     `docker run --rm --entrypoint sh citgroup-tenancy-system:ci -c "grep -rq 'tenancy.example.test' .next/static && echo inlined"`
   - `docker compose down -v`
5. Re-run the CI smoke-test script against a locally built image with
   `MYSQL_HOST=127.0.0.1` and no database — expect status `503` and exit code 0.
6. After push, open the Actions run for the commit and confirm both `verify` and
   `Docker image builds` are green. This cannot be observed from this machine.

## Risks

- **`jq` availability.** Preinstalled on GitHub-hosted `ubuntu-latest`. If it is
  ever missing, replace the assertion with
  `grep -q '"service":"citgroup-tenancy-system"'` and `grep -q '"storage":"mysql"'`.
- **Cold start.** The polling loop allows 90s. If a runner is slower, raise the
  loop count rather than reverting to a fixed `sleep`.
- **Build-arg cache invalidation.** Changing `NEXT_PUBLIC_ROOT_DOMAIN` now
  invalidates the `pnpm build` layer. That is correct — the value is baked into
  the output — but it is a cache-cost regression worth knowing about.
- **One image per public domain.** Because two client components inline the
  value, a single image cannot serve two different root domains. Acceptable for
  this deployment model; record it if multi-domain hosting is ever planned.
- **`ADMIN_*` values in CI** are test-only placeholders, not production secrets.

## Follow-ups (explicitly out of scope)

1. `lib/redis.ts` throws at module scope, so `/api/health` returns **500**
   instead of **503** when the store is unconfigured — an orchestrator cannot
   distinguish "route broken" from "dependency missing". A lazy store accessor
   would let the health route report a failed check with a diagnostic. Worth
   doing, but it changes the guard's shape and needs its own test.
2. Running a real MySQL in the docker job and asserting `200 healthy` instead of
   tolerating `503`. `docker-compose.yml` covers this path today.
3. The two client components could read the root domain from a server-rendered
   prop instead of `process.env`, removing the build-time constraint entirely.

# CI observation: run 41164789724 (commit 663a67c) failed at 'Set up pnpm'; the pnpm/action-setup version conflict was already removed from .github/workflows/ci.yml in that same commit. A re-run should pass.
