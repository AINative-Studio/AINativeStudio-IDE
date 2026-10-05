# AINative Backend Contract Notes

Reference for the IDE's integration with the AINative managed cloud backend.
Produced by issue #143 ("[BLOCKER] AINative backend contract has drifted since
IDE integration was built") as the shared foundation for issues #144-#148.

**Last verified:** 2026-10-05 against `https://api.ainative.studio` (live probes)
and `https://docs.ainative.studio`.

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
| GET | `/api/v1/public/credits/balance` | `X-API-Key` | Live 401 |

Two things to internalize here:
- The `/public/` segment is **required**. `/api/v1/credits/balance` returns 404.
- This is a **separate call** from chat completions. Credits are *not* returned
  inline on a chat response, so `credits_consumed` / `credits_remaining` cannot
  be read off a chat result. (#147)

### Model catalog

| Method | Path | Auth | Verification |
| --- | --- | --- | --- |
| GET | `/v1/public/models` | `X-API-Key` | Live 401 |
| GET | `/v1/public/models/available` | `X-API-Key` | Live 401 |

`/v1/public/models/available` is the set currently servable; `/v1/public/models`
is the full catalog. `/api/v1/public/models/available` is equivalent.

The previously hard-coded `/api/v1/models/list` is **confirmed 404** and was one
of the real drifts.

The JSON envelope of these responses is **NOT verified** — inspecting it requires
a valid API key. `aiModelRegistryService.ts` currently assumes a `{ models: [...] }`
wrapper carried over from the dead `/models/list` route; treat that as an
unconfirmed assumption.

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
real path with the backend team before relying on it. (#147)

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

```
gpt-5.3-codex
qwen3-coder-30b-a3b
qwen-coder-32b
qwen-coder-7b
claude-sonnet-4.5
claude-sonnet-4.6
claude-opus-4.5
claude-opus-4.6
```

Heads-up for #144 and anyone touching the model list: the IDE's hard-coded
defaults in `modelCapabilities.ts` (`defaultModelsOfProvider.ainativeCloud` and
`ainativeCloudModelOptions`) are **stale** — they still list `claude-sonnet-4-5`,
`claude-haiku-4`, `gpt-4o`, `gpt-4o-mini`. Refreshing those lists was left out of
#143 on purpose: it is model-catalog work, not endpoint/auth correctness, and
touching it would collide with #144. Note the dash-vs-dot spelling difference
(`claude-sonnet-4-5` vs `claude-sonnet-4.5`) when you do reconcile them.

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
- Usage-tracking sync logic — #147.
- Tool logs — #148.
- Refreshing the stale hard-coded model lists (section 4).

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

To stop this drifting silently again, #143's issue thread suggests committing the
backend's OpenAPI spec (or a generated TS client) into this repo.
