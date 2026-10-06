# AINative Backend Contract Notes

Reference for the IDE's integration with the AINative managed cloud backend.
Produced by issue #143 ("[BLOCKER] AINative backend contract has drifted since
IDE integration was built") as the shared foundation for issues #144-#148.

**Last verified:** 2026-10-05 against `https://api.ainative.studio` (live probes,
plus the published OpenAPI document at `/openapi.json`) and
`https://docs.ainative.studio`.

Updated by #147 with the confirmed credits/usage response shapes and section 8.

> Read the "Verification status" column before trusting any row. Some paths are
> confirmed live, some are documented-only, and a few are explicitly unknown.
> Where something is unknown this document says so rather than guessing — please
> keep that property when you edit it.

---

## 1. Base URL

| Environment | Base URL |
| --- | --- |
| Production | `https://api.ainative.studio` |
| Staging | `https://staging-api.ainative.studio` |
| Local dev | `http://localhost:8000` |

Both `/v1/...` and `/api/v1/...` prefixes are served and resolve to the same
backend. Prefer `/api/v1/...`, which is what the docs use for most routes.

---

## 2. Two distinct auth models (the single most important thing on this page)

The drift that caused #143 is that the IDE was built assuming **one** auth model
(JWT) when the backend actually uses **two**, for different endpoint families.
Do not treat these as interchangeable — they are not.

### 2a. `X-API-Key` — inference and public data

Used for raw chat completions, the credits balance, and the public model
catalog.

```
X-API-Key: sk_...
```

Key prefixes accepted by the backend:

| Prefix | Meaning | Lifetime |
| --- | --- | --- |
| `sk_` | Permanent key (authenticated account) | No expiry |
| `tmp_` | Temporary instant-db key | 72 hours |
| `zdb_live_` | Permanent, from claiming a temp project | No expiry |

Notes:
- There is **no `ak_` prefix.** Some AINative SDK docs mention `ak_`; that is
  stale. Do not put `ak_` in user-facing copy.
- Keys from other vendors (e.g. an Anthropic `sk-ant-...` key) are rejected with
  401. User-facing error copy should say so, because pasting the wrong vendor's
  key is the most likely user mistake.
- A 401 on an API key is **not** recoverable by refreshing a token. Fail fast
  with actionable copy instead of burning a retry.

### 2b. `Authorization: Bearer <jwt>` — user sessions and metered endpoints

Used for the `/api/v1/auth/*` session endpoints, `/api/v1/users/me`, and the
`/api/v1/managed/*` metered surface. Access tokens are refreshed via
`/api/v1/auth/refresh`.

---

## 3. Confirmed endpoints

Verification legend:
- **Live 401** — probed; returned 401 (endpoint exists, requires auth). Strong evidence.
- **Live 422** — probed; returned 422 (exists, rejected an empty body). Strong evidence.
- **Docs** — documented but not independently probed.
- **404** — probed and confirmed absent.

### Chat completions (raw inference)

| Method | Path | Auth | Verification |
| --- | --- | --- | --- |
| POST | `/api/v1/chat/completions` | `X-API-Key` | Live 401 + Docs |

OpenAI-compatible. This is the endpoint `AINativeCloudProvider` targets.

The old hard-coded value `/v1/chat/completions` (no `/api` prefix) was one of the
drifts reported in #143. Note that `/v1/chat/completions` does also resolve (both
prefixes are served), but `/api/v1/chat/completions` is the canonical form.

Request body fields: `model`, `messages`, `stream`, `max_tokens` (default 4096),
`temperature` (default 0.7, range 0.0-2.0), `top_p` (default 1.0), `system`
(system prompt as a top-level field).

An OpenAI SDK can be pointed at this by setting `base_url` to
`https://api.ainative.studio/api/v1`.

### Auth / session (JWT)

| Method | Path | Auth | Verification |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | none | Live 422 |
| POST | `/api/v1/auth/register` | none | Docs |
| POST | `/api/v1/auth/refresh` | refresh token | Docs |
| POST | `/api/v1/auth/logout` | Bearer | Docs |
| GET | `/api/v1/users/me` | Bearer | Live 401 |
| POST | `/api/v1/auth/forgot-password` | none | Docs |
| POST | `/api/v1/auth/reset-password` | none | Docs |

`GET /api/v1/auth/login` returns 404 — it is POST-only. Don't let that mislead
you into thinking the route is missing.

### Credits

| Method | Path | Auth | Verification |
| --- | --- | --- | --- |
| GET | `/api/v1/public/credits/balance` | `X-API-Key` | Live 401 + OpenAPI |

Two things to internalize here:
- The `/public/` segment is **required**. `/api/v1/credits/balance` returns 404.
- This is a **separate call** from chat completions. Credits are *not* returned
  inline on a chat response, so `credits_consumed` / `credits_remaining` cannot
  be read off a chat result. (#147)

**Response shape — now CONFIRMED (#147).** The backend serves its OpenAPI
document at `https://api.ainative.studio/openapi.json` (no auth required), which
is the authoritative source for every envelope this file previously listed as
unverified. Schema `CreditsBalanceResponse`:

```ts
{
  total_credits: number;      // integer
  used_credits: number;
  remaining_credits: number;
  unlimited: boolean;         // true on unmetered plans
  plan: string;               // plan tier, e.g. 'free'
  period_start: string;
  period_end?: string | null; // nullable
  usage_percentage: number;   // 0-100
}
```

Note for anyone carrying over the field names from #147's original issue text:
they were a guess and they were **wrong**. There is no `credits_consumed` /
`credits_remaining` on this endpoint — those names belong to the chat-completion
response. Use the names above.

The schema's own description states it is returned "as a bare object, NOT wrapped
in a success/data envelope (unlike its sibling credits endpoints)" — so do not
unwrap a `{ success, data }` layer here. Its siblings
(`/credits/usage/current`, `/credits/transactions`) *are* enveloped.

### Model catalog

| Method | Path | Auth | Verification |
| --- | --- | --- | --- |
| GET | `/v1/public/models` | `X-API-Key` | Live 401 |
| GET | `/v1/public/models/available` | `X-API-Key` | Live 401 |

`/v1/public/models/available` is the set currently servable; `/v1/public/models`
is the full catalog. `/api/v1/public/models/available` is equivalent.

The previously hard-coded `/api/v1/models/list` is **confirmed 404** and was one
of the real drifts.

The JSON envelope of these responses was recorded here as **NOT verified** on the
assumption that inspecting it required a valid API key. That turned out to be
unnecessary: the backend publishes an unauthenticated OpenAPI document (see
below), so these envelopes *can* be confirmed without credentials. Doing so for
the model catalog was out of scope for #147 (which only needed credits/usage),
but it is now a lookup rather than an unknown — `aiModelRegistryService.ts`'s
assumed `{ models: [...] }` wrapper should be checked against the document
rather than left flagged.

### The OpenAPI document (the reliable way to resolve any envelope)

```bash
curl -s https://api.ainative.studio/openapi.json
```

Served without auth, ~6.6MB, 3200+ paths. `components.schemas` carries the exact
request/response shape for every endpoint, including the required/nullable flags
and worked examples. This is strictly better evidence than a status-code probe
and should be the first stop for any future response-shape question — several
rows in this file were marked "unverified" only because this was not known to be
available.

Caveat on auth: the document declares only `HTTPBearer` / `OAuth2PasswordBearer`
security schemes and most paths list `security: None`. The `X-API-Key` model is
**not** represented there (it is enforced via a framework dependency that does
not surface in the schema), so do not read the document as saying these endpoints
are unauthenticated or JWT-only. For auth, trust the live probes and section 2.

### Managed / metered surface

| Method | Path | Auth | Verification |
| --- | --- | --- | --- |
| POST | `/api/v1/managed/chat/completions` | Bearer | Live 401 |
| GET | `/api/v1/managed/usage` | Bearer | Live 401 |
| GET | `/api/v1/managed/usage/history` | Bearer | Live 401 |
| GET | `/api/v1/managed/models` | Bearer | Live 401 |
| POST | `/api/v1/managed/estimate` | Bearer | **404 — likely absent** |

This surface is real. #143 originally suspected the `/managed` prefix might be
stale; live probing disproved that, so `managedChatAPIService.ts` keeps its
`https://api.ainative.studio/api/v1/managed` base URL.

`/api/v1/managed/estimate` is the exception: it 404s where every sibling returns
401, so `ManagedChatAPIService.estimateCost()` will throw at runtime. Confirm the
real path with the backend team before relying on it. The OpenAPI document also
has no `/managed/estimate` entry, which corroborates the 404 — treat it as
genuinely absent rather than merely unprobed. (#147)

**Usage/history response shapes — CONFIRMED (#147)** from the OpenAPI document:

`GET /api/v1/managed/usage?period=daily|weekly|monthly` → `CurrentUsageResponse`:

```ts
{
  period: string;
  credits_used: number;
  credits_remaining: number;   // -1 means unlimited
  requests_count: number;      // integer
  total_tokens: number;        // integer
  models_used: Record<string, number>;
}
```

`GET /api/v1/managed/usage/history?days=N` → `UsageHistoryResponse`:

```ts
{ history: Array<{ date: string; requests: number; credits_used: number; tokens: number }> }
```

Entries are documented as sorted **date-descending**. `days` defaults to 30 and
the backend validates the 1-365 range, so clamp before sending.

Two consequences worth recording:
- A real server-side usage-history endpoint **does exist**. #147 asked whether
  local-record-derived history was the right permanent design; it is not — the
  server is authoritative and should be queried first, with local records as a
  fallback only.
- The existing `UsageStats` / `UsageHistory` / `DailyUsage` interfaces in
  `managedChatAPIService.ts` do **not** match these schemas (e.g. `UsageStats`
  declares `period`/`credits_used` alongside a `models_used` map but is typed
  against the older guess). Reconciling those interfaces was out of scope for
  #147, which only consumes `usage/history` and does so via its own locally
  declared response types. Worth a follow-up.

### Unverified — do not trust without confirming

These are still referenced in `aiModelRegistryService.ts` and were deliberately
**not** changed, because inventing a replacement path would be worse than a
documented unknown:

`/api/v1/models/invoke`, `/api/v1/usage/stats`, `/api/v1/usage/quota`,
`/api/v1/models/track`

Each returns 404 on GET but 405 on POST, which is ambiguous — possibly a gateway
artifact rather than proof of existence. Also note that billed inference already
has a confirmed home at `POST /api/v1/managed/chat/completions`, so
`/models/invoke` may simply be obsolete.

---

## 4. Current coding model IDs

**Spelling uses DASHES, not dots** (corrected by #158 — see below):

```
gpt-5-3-codex
qwen3-coder-30b-a3b
qwen-coder-32b
qwen-coder-7b
claude-sonnet-4-5
claude-sonnet-4-6
claude-opus-4-5
claude-opus-4-6
```

### Correction (#158): this section previously listed dotted IDs and was wrong

An earlier revision of this section listed `gpt-5.3-codex`, `claude-sonnet-4.5`
etc. with dots, and told the next reader to "note the dash-vs-dot spelling
difference" when reconciling `modelCapabilities.ts`. That was backwards. The dots
came from the models' **display names** ("GPT-5.3 Codex"), not from their
identifiers. Following that guidance would have replaced one set of
backend-rejected IDs with another.

Evidence gathered for #158 on 2026-10-05:

- `GET /api/v1/public/ai-registry/models?limit=300` — **unauthenticated, 200 OK**,
  85 models. Every record's `slug` is dash-spelled: `gpt-5-3-codex`,
  `claude-sonnet-4-5`, `qwen3-coder-30b-a3b`, `glm-5-3`. Dots appear only in the
  human-readable `name` field.
- `GET /api/v1/public/ai-registry/models/by-slug/gpt-5-3-codex` → **200 OK**.
  `GET .../by-slug/gpt-5.3-codex` → **404 `{"detail":"Model not found"}`**.
- `openapi.json` (6.6MB) contains **zero** dotted model identifiers. Every
  model-name example in it is dash-spelled, e.g. the `/api/v1/rlhf/feedback/export`
  `model` filter documents "e.g., claude-opus-4-8, gpt-oss-120b", and
  `CodingSessionCreate.model` defaults to `claude-sonnet-4-20250514`.

This registry is the public catalog and is keyed by URL slug. `ChatCompletionRequest.model`
is an unconstrained `string | null` in the OpenAPI document (no enum), so the
schema alone cannot confirm an accepted value — the slug/`by-slug` agreement plus
the absence of any dotted form anywhere is the basis for the dash spelling.

Note that `claude-sonnet-4-5` happened to be correct in the old IDE defaults; the
genuinely stale entries were `claude-haiku-4`, `gpt-4o`, and `gpt-4o-mini`, none
of which exist in the live catalog.

Context windows, also from that live catalog (`context_window`):

| Model | Context window |
| --- | --- |
| `gpt-5-3-codex` | 131,072 |
| `qwen3-coder-30b-a3b` | 262,144 |
| `qwen-coder-32b` | 131,072 |
| `qwen-coder-7b` | 131,072 |
| `claude-sonnet-4-5` | 200,000 |
| `claude-sonnet-4-6` | reported `0` — unpopulated record, not a real limit |
| `claude-opus-4-5` | reported `0` — unpopulated record |
| `claude-opus-4-6` | reported `0` — unpopulated record |

The `0` values are missing data in the registry, so `modelCapabilities.ts` uses
the Claude family's documented 200k window for those three and marks each with a
comment. The registry reports no `pricing` for any chat model (AINative Cloud
inference is billed in account credits), so the IDE's `cost` stays `{input: 0,
output: 0}` for all of them.

`modelCapabilities.ts` was refreshed in #158. The long-term fix — replacing the
static list with a live `GET /v1/public/models/available` call — remains separate
roadmap scope; that endpoint requires an `X-API-Key` (401 unauthenticated),
whereas the `ai-registry` catalog above does not and is therefore the easier
source to verify against by hand.

---

## 5. Where the `ainativeCloud` API key lives in settings

**This is what #145 and #146 need.** The key follows the exact same BYOK pattern
as `anthropic`, `openAI`, and every other provider.

Read it at:

```ts
settingsOfProvider.ainativeCloud.apiKey
```

Declared in `modelCapabilities.ts`:

```ts
// defaultProviderSettings
ainativeCloud: {
    apiKey: '',
},
```

Why that declaration matters more than it looks: `customSettingNamesOfProvider()`
in `ainativeSettingsTypes.ts` derives the Settings UI fields from
`Object.keys(defaultProviderSettings[providerName])`. Before #143 this object was
empty (`{}`, with a comment claiming "No API key needed — uses user session"), so
the Settings UI rendered **no API key input at all** and the key could never be
populated. Adding `apiKey: ''` is what makes the field appear and the whole chain
reachable.

Two consequences worth knowing:

1. **`_didFillInProviderSettings` now behaves correctly.** It is computed as
   `Object.keys(defaultProviderSettings[provider]).every(key => !!settings[key])`.
   With an empty object, `.every()` over an empty array returns `true`, so
   `ainativeCloud` was *always* reported as fully configured even with zero
   credentials. It now correctly requires a non-empty `apiKey`.

2. **Writes go through the normal path.** Use
   `setSettingOfProvider('ainativeCloud', 'apiKey', value)` — no special casing.

Placeholder copy for the settings field is `sk_key...`, set in
`displayInfoOfSettingName`, and the field is already marked `isPasswordField`.

### Still to wire (#145 / #146)

`descOfProviderName()` and `subTextMdOfProviderName()` in
`ainativeSettingsTypes.ts` both still `throw` for `ainativeCloud` (no branch
exists). That is the settings crash in **#145** and was intentionally left alone
here to avoid merge conflicts. The key plumbing is ready for you; only the
display metadata is missing.

---

## 6. What changed in this commit (#143)

Scope was deliberately limited to contract, endpoint, and auth correctness so
that #144-#148 start from a clean, conflict-free base.

**`electron-main/llmMessage/providers/ainativeCloudProvider.ts`**
- Endpoint corrected to `/api/v1/chat/completions` (was `/v1/chat/completions`).
- Primary auth switched to the `X-API-Key` header, with a graceful
  `Authorization: Bearer` JWT fallback so existing logged-in installs degrade
  instead of hard-breaking.
- Constructor takes an optional second `apiKey` param (existing call sites are
  unaffected); added a per-request `apiKey` override.
- Added `top_p` and `system` request params, documented backend defaults.
- API-key 401s now fail fast (non-retryable) with copy naming all three valid
  prefixes (`sk_`, `tmp_`, `zdb_live_`) and calling out the wrong-vendor case;
  the response body is attached for diagnosis. JWT 401s still refresh and retry.

**`common/modelCapabilities.ts`**
- `defaultProviderSettings.ainativeCloud` gains `apiKey: ''`, replacing the
  incorrect "No API key needed" comment. This is what surfaces the field in the
  Settings UI (see section 5).

**`common/ainativeSettingsTypes.ts`**
- `defaultSettingsOfProvider.ainativeCloud` now uses the same spread pattern as
  every other provider, so `apiKey` is typed `string` rather than `undefined`.
- Added the `sk_key...` placeholder for the API key field.

**`common/managedChatAPIService.ts`**
- Documented that the `/api/v1/managed` base URL is **verified correct** (kept,
  not changed) and that it is JWT-authenticated, unlike raw chat completions.
- Added `ManagedChatAPIService.CREDITS_BALANCE_URL` pointing at the confirmed
  `GET /api/v1/public/credits/balance`, with a note that credits are a separate
  call from chat.
- Flagged `estimateCost()` as hitting a 404 path.

**`common/usageTrackingService.ts`**
- Corrected the credits assumptions in `_syncCreditsStatus()`: documented the
  real path and `X-API-Key` auth, noted that `getUserUsage('monthly')` is a
  usage-stats call and *not* a credits-balance substitute, and flagged that the
  `isAuthenticated()` JWT gate is the wrong precondition for an API-key-authed
  balance fetch.

**`common/aiModelRegistryService.ts`**
- Replaced the 404ing `/api/v1/models/list` with `/v1/public/models/available`
  via a new `MODELS_AVAILABLE_ENDPOINT` constant.
- Documented that the response envelope and the `X-API-Key`-vs-JWT mismatch are
  unverified, and that full live-catalog replacement is out of scope.
- Listed the four ambiguous endpoints that were left untouched.

### Explicitly NOT done (owned by other issues)

- `sendAINativeCloudChat` in `sendLLMMessage.impl.ts` is **still a stub** — #144.
  It is the only place that can pass `settingsOfProvider.ainativeCloud.apiKey`
  into the provider's new constructor param, so #144 should do exactly that.
- The `throw` statements in `ainativeSettingsTypes.ts` — #145.
- Mounting the real auth webview — #146.
- Usage-tracking sync logic — #147 (**done**, see section 8).
- Tool logs — #148.
- Refreshing the stale hard-coded model lists (section 4) — done in #158.

---

## 7. How to re-verify

Endpoint existence can be checked without credentials — an endpoint that exists
returns 401/422, one that doesn't returns 404:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://api.ainative.studio/api/v1/public/credits/balance
# 401 => exists, needs auth.  404 => gone/renamed.
```

Remember to check the right HTTP method; `GET` on a POST-only route returns 404
or 405 and can look like a missing endpoint.

For response shapes, prefer the OpenAPI document over probing — see "The OpenAPI
document" under the model catalog above:

```bash
curl -s https://api.ainative.studio/openapi.json | \
  python3 -c "import json,sys; s=json.load(sys.stdin); print(json.dumps(s['components']['schemas']['CreditsBalanceResponse'],indent=2))"
```

To stop this drifting silently again, #143's issue thread suggests committing the
backend's OpenAPI spec (or a generated TS client) into this repo. #147 strongly
seconds this: the document is fetchable unauthenticated, so a CI job that diffs
the committed copy against live would have caught every drift in this file
automatically.

---

## 8. Usage tracking / credits sync (#147)

`common/usageTrackingService.ts` previously never called the backend — both
`_syncCreditsStatus()` and `getCreditsHistory()` were local-only placeholders.
Now:

**Credits balance** — `_syncCreditsStatus()` calls
`GET /api/v1/public/credits/balance` with `X-API-Key`, reading the key from
`settingsOfProvider.ainativeCloud.apiKey` (section 5).

The auth gate #143 flagged is fixed: the fetch is gated on **having a configured
API key**, not on `cloudAuthService.isAuthenticated()`. That method reports
whether a JWT session exists, which is an unrelated precondition for an
`X-API-Key` endpoint — it previously denied a correctly-keyed install its own
balance. The same wrong gate was also removed from `getCreditsStatus()` and
`trackManagedUsage()`. **Do not reintroduce it in a credits path.** The
`isAuthenticated()` checks that remain in this service are all on *quota* paths,
which genuinely are JWT-authed via the model registry.

Other behaviour worth knowing:
- Rate limited to one balance fetch per 30s, with concurrent callers sharing one
  in-flight request, because `trackManagedUsage()` syncs after every chat turn.
  Between fetches a local optimistic delta keeps the UI responsive; the next
  real fetch overwrites it with authoritative state.
- A 401/403 is treated as non-retryable configuration error (section 2a) rather
  than being retried on the timer.
- On any failure the cached status is **retained**, never clobbered with zeroes,
  so a transient network error cannot make the UI claim zero credits.
- `unlimited: true` suppresses the low-credits warning entirely, and
  `onCreditsLow` fires only on the transition into the low state, not on every
  periodic sync.

**Triggers:** IDE startup; whenever the `ainativeCloud` API key changes in
settings (via `onDidChangeState`, since a pasted key raises no auth event); on
transition to authenticated; every 5 minutes on the existing sync timer; and
after each managed chat request (subject to the rate limit).

**History** — `getCreditsHistory()` queries
`GET /api/v1/managed/usage/history?days=N` (JWT, since it is on the `/managed`
surface) and falls back to local managed-usage records when there is no session
or the request fails. So the two credits features deliberately have *different*
preconditions — balance needs an API key, history needs a JWT — which follows
from the backend's two auth models rather than being an oversight.

`CreditsHistory` gained a `source: 'backend' | 'local'` field so UI can tell the
authoritative account-wide figures from the local fallback, which only sees
requests made from this install and therefore under-reports.
