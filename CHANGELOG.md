# Changelog

## [Unreleased]

## [1.12.1] - 2026-11-28

- fix(mcp): offline CMS guides, token-file, origin, sign-in errors, pinned publisher
- docs(plugins): add 6-language READMEs (EN/zh-CN/ru/es/de/tr) and YouTube walkthrough previews across all 25 Paymos-labs repos

- fix(mcp): `merchant_update_project_widget` keeps the saved `allowed_origin` and `is_active` when they are omitted (`is_active` is now optional; an empty `allowed_origin` still clears the origin)
- fix(mcp): serve the Blesta, FOSSBilling and Paymenter guides offline (`30` compiled `paymos://docs/*` pages) so every CMS the advisor recommends can be read via `resources/read`; docs and the `paymos-integrate` skill now list all 15 official CMS plugins
- fix(mcp): `setup` and `auth` write a non-default `--token-file` into the `connect` command, so the bridge reads the saved sign-in instead of opening the browser again
- fix(mcp): `install-secret`, `upload-file` and `download-file` accept `--origin` (or `PAYMOS_MCP_ORIGIN`) and bind the prepared proof to that origin
- fix(mcp): `connect` explains a background sign-in that failed after approval once, instead of silently opening a new sign-in
- ci(mcp): pin `mcp-publisher` to an official release and verify its SHA-256 before it receives the registry DNS key

## [1.12.0] - 2026-11-25

- feat(cms): rebuild Blesta, FOSSBilling, and Paymenter to full Paymos CMS lifecycle standard [skip ecosystem release]

- chore(mcp): add square 256x256 and 400x400 PNG logos, non-root `Dockerfile`, `glama.json` maintainer metadata, Glama badge, GEO FAQ section, and Official MCP Registry CI job (`publish.yml`)
- feat(mcp): add multi-AI Git plugin wrapper manifests (Claude Code, OpenAI Codex, Antigravity, Gemini CLI, GitHub Copilot CLI, Cursor, Agent Plugins 1.0, and Official MCP Registry `server.json` / `mcpName`), shared `rules/`, square `assets/logo.svg`, and 4 cross-platform Paymos Agent Skills (`paymos-integrate`, `paymos-webhooks`, `paymos-sandbox`, `paymos-workspace`) over remote Streamable HTTP Merchant MCP (`https://app.paymos.io/connect/merchant-mcp`) without inflating the `@paymos/mcp` npm tarball
- feat(mcp): auto-open default browser and print/return full clickable `continue_url` and `authorize_url` handoff links in `connect`, `setup`, and `auth` with non-blocking background OAuth PKCE for any browser alongside canonical 6-cell TOTP + Passkey confirmation
- feat(mcp): make `npx -y @paymos/mcp setup` the single zero-key onboarding entrypoint with optional `[Y/n]` browser OAuth sign-in, moving key-based Sandbox flow under `--sandbox`
- feat(mcp): compile `27` Paymos documentation pages (`paymos://docs/*`), `CONNECT_INSTRUCTIONS`, and offline `paymos_auth_status`, `recommend_payment_integration` (12 CMS + widget + POS + invoices + channels), and `verify_webhook_signature` tools into `connect` (`191` tools total before login)
- ui(dashboard): unify `/developers/agents` around `npx -y @paymos/mcp setup` and direct MCP URL
- feat(mcp): connect a merchant account from Codex or Claude Code through Paymos OAuth, with Owner consent and dashboard connection management
- feat(mcp): add proof-bound `install-secret`, `upload-file`, and `download-file` helpers alongside local Sandbox

## [1.11.1] - 2026-11-24

- fix(mcp): keep only paymos-dev maintainer in glama.json [release:patch]
- fix(mcp): publish marketplace PNG logos, Dockerfile, Glama metadata, and MCP Registry CI job [release:patch]
- chore(mcp,n8n): add marketplace PNG logos, Dockerfile, Glama badge/config, MCP Registry CI job, and GEO FAQs

- chore(mcp): add square 256x256 and 400x400 PNG logos, non-root `Dockerfile`, `glama.json` maintainer metadata, Glama badge, GEO FAQ section, and Official MCP Registry CI job (`publish.yml`)
- feat(mcp): add multi-AI Git plugin wrapper manifests (Claude Code, OpenAI Codex, Antigravity, Gemini CLI, GitHub Copilot CLI, Cursor, Agent Plugins 1.0, and Official MCP Registry `server.json` / `mcpName`), shared `rules/`, square `assets/logo.svg`, and 4 cross-platform Paymos Agent Skills (`paymos-integrate`, `paymos-webhooks`, `paymos-sandbox`, `paymos-workspace`) over remote Streamable HTTP Merchant MCP (`https://app.paymos.io/connect/merchant-mcp`) without inflating the `@paymos/mcp` npm tarball
- feat(mcp): auto-open default browser and print/return full clickable `continue_url` and `authorize_url` handoff links in `connect`, `setup`, and `auth` with non-blocking background OAuth PKCE for any browser alongside canonical 6-cell TOTP + Passkey confirmation
- feat(mcp): make `npx -y @paymos/mcp setup` the single zero-key onboarding entrypoint with optional `[Y/n]` browser OAuth sign-in, moving key-based Sandbox flow under `--sandbox`
- feat(mcp): compile `27` Paymos documentation pages (`paymos://docs/*`), `CONNECT_INSTRUCTIONS`, and offline `paymos_auth_status`, `recommend_payment_integration` (12 CMS + widget + POS + invoices + channels), and `verify_webhook_signature` tools into `connect` (`191` tools total before login)
- ui(dashboard): unify `/developers/agents` around `npx -y @paymos/mcp setup` and direct MCP URL
- feat(mcp): connect a merchant account from Codex or Claude Code through Paymos OAuth, with Owner consent and dashboard connection management
- feat(mcp): add proof-bound `install-secret`, `upload-file`, and `download-file` helpers alongside local Sandbox

## [1.11.0] - 2026-11-23

- fix(checkout,pos,studio,chat): resolve 36 audit defects, BUG-1211 tails, and mobile edge chat launcher
- feat(platform): integrate pending main WIP — drop fiat_exchange_rates/VES, blockchain/worker fix batches 1-7, compact auth email layout, status-worker, plugins, forge and docs

- feat(mcp): add multi-AI Git plugin wrapper manifests (Claude Code, OpenAI Codex, Antigravity, Gemini CLI, GitHub Copilot CLI, Cursor, Agent Plugins 1.0, and Official MCP Registry `server.json` / `mcpName`), shared `rules/`, square `assets/logo.svg`, and 4 cross-platform Paymos Agent Skills (`paymos-integrate`, `paymos-webhooks`, `paymos-sandbox`, `paymos-workspace`) over remote Streamable HTTP Merchant MCP (`https://app.paymos.io/connect/merchant-mcp`) without inflating the `@paymos/mcp` npm tarball
- feat(mcp): auto-open default browser and print/return full clickable `continue_url` and `authorize_url` handoff links in `connect`, `setup`, and `auth` with non-blocking background OAuth PKCE for any browser alongside canonical 6-cell TOTP + Passkey confirmation
- feat(mcp): make `npx -y @paymos/mcp setup` the single zero-key onboarding entrypoint with optional `[Y/n]` browser OAuth sign-in, moving key-based Sandbox flow under `--sandbox`
- feat(mcp): compile `27` Paymos documentation pages (`paymos://docs/*`), `CONNECT_INSTRUCTIONS`, and offline `paymos_auth_status`, `recommend_payment_integration` (12 CMS + widget + POS + invoices + channels), and `verify_webhook_signature` tools into `connect` (`191` tools total before login)
- ui(dashboard): unify `/developers/agents` around `npx -y @paymos/mcp setup` and direct MCP URL
- feat(mcp): connect a merchant account from Codex or Claude Code through Paymos OAuth, with Owner consent and dashboard connection management
- feat(mcp): add proof-bound `install-secret`, `upload-file`, and `download-file` helpers alongside local Sandbox

## [1.10.0] - 2026-11-22

- feat(mcp): add multi-AI Git plugin wrapper, Codex hybrid OAuth, agents install panel and per-AI docs tabs
- fix(mcp,oauth,blazor,arch): harden Merchant MCP OAuth/scopes/pagination/UI, fix Blazor lifecycle/overview/DashButton Role, add MigrationSafetyTests and NEAR timeout guard (BUG-1431, BUG-1441..1446, BUG-1458..1460, BUG-1468..1471, BUG-1475, BUG-1477, BUG-1482)

- feat(mcp): add multi-AI Git plugin wrapper manifests (Claude Code, OpenAI Codex, Antigravity, Gemini CLI, GitHub Copilot CLI, Cursor, Agent Plugins 1.0, and Official MCP Registry `server.json` / `mcpName`), shared `rules/`, square `assets/logo.svg`, and 4 cross-platform Paymos Agent Skills (`paymos-integrate`, `paymos-webhooks`, `paymos-sandbox`, `paymos-workspace`) over remote Streamable HTTP Merchant MCP (`https://app.paymos.io/connect/merchant-mcp`) without inflating the `@paymos/mcp` npm tarball
- feat(mcp): auto-open default browser and print/return full clickable `continue_url` and `authorize_url` handoff links in `connect`, `setup`, and `auth` with non-blocking background OAuth PKCE for any browser alongside canonical 6-cell TOTP + Passkey confirmation
- feat(mcp): make `npx -y @paymos/mcp setup` the single zero-key onboarding entrypoint with optional `[Y/n]` browser OAuth sign-in, moving key-based Sandbox flow under `--sandbox`
- feat(mcp): compile `27` Paymos documentation pages (`paymos://docs/*`), `CONNECT_INSTRUCTIONS`, and offline `paymos_auth_status`, `recommend_payment_integration` (12 CMS + widget + POS + invoices + channels), and `verify_webhook_signature` tools into `connect` (`191` tools total before login)
- ui(dashboard): unify `/developers/agents` around `npx -y @paymos/mcp setup` and direct MCP URL
- feat(mcp): connect a merchant account from Codex or Claude Code through Paymos OAuth, with Owner consent and dashboard connection management
- feat(mcp): add proof-bound `install-secret`, `upload-file`, and `download-file` helpers alongside local Sandbox

## [1.9.1] - 2026-11-20

- fix(audit): sync MCP resources & SDK 2.7.1, WebBackend OpenAPI/types, invoice products UI, and 6-locale checkout/agent docs

- feat(mcp): auto-open default browser and print/return full clickable `continue_url` and `authorize_url` handoff links in `connect`, `setup`, and `auth` with non-blocking background OAuth PKCE for any browser alongside canonical 6-cell TOTP + Passkey confirmation
- feat(mcp): make `npx -y @paymos/mcp setup` the single zero-key onboarding entrypoint with optional `[Y/n]` browser OAuth sign-in, moving key-based Sandbox flow under `--sandbox`
- feat(mcp): compile `27` Paymos documentation pages (`paymos://docs/*`), `CONNECT_INSTRUCTIONS`, and offline `paymos_auth_status`, `recommend_payment_integration` (12 CMS + widget + POS + invoices + channels), and `verify_webhook_signature` tools into `connect` (`191` tools total before login)
- ui(dashboard): unify `/developers/agents` around `npx -y @paymos/mcp setup` and direct MCP URL
- feat(mcp): connect a merchant account from Codex or Claude Code through Paymos OAuth, with Owner consent and dashboard connection management
- feat(mcp): add proof-bound `install-secret`, `upload-file`, and `download-file` helpers alongside local Sandbox

## [1.9.0] - 2026-11-20

- feat(mcp): unify 6-cell 2FA step-up UI and dual browser-open + URL handoff

- feat(mcp): auto-open default browser and print/return full clickable `continue_url` and `authorize_url` handoff links in `connect`, `setup`, and `auth` with non-blocking background OAuth PKCE for any browser alongside canonical 6-cell TOTP + Passkey confirmation
- feat(mcp): make `npx -y @paymos/mcp setup` the single zero-key onboarding entrypoint with optional `[Y/n]` browser OAuth sign-in, moving key-based Sandbox flow under `--sandbox`
- feat(mcp): compile `27` Paymos documentation pages (`paymos://docs/*`), `CONNECT_INSTRUCTIONS`, and offline `paymos_auth_status`, `recommend_payment_integration` (12 CMS + widget + POS + invoices + channels), and `verify_webhook_signature` tools into `connect` (`191` tools total before login)
- ui(dashboard): unify `/developers/agents` around `npx -y @paymos/mcp setup` and direct MCP URL
- feat(mcp): connect a merchant account from Codex or Claude Code through Paymos OAuth, with Owner consent and dashboard connection management
- feat(mcp): add proof-bound `install-secret`, `upload-file`, and `download-file` helpers alongside local Sandbox

## [1.8.0] - 2026-11-19

- feat(mcp): make setup universal with advisor mode and fix consent scroll

- feat(mcp): make `npx -y @paymos/mcp setup` the single zero-key onboarding entrypoint with optional `[Y/n]` browser OAuth sign-in, moving key-based Sandbox flow under `--sandbox`
- feat(mcp): compile `27` Paymos documentation pages (`paymos://docs/*`), `CONNECT_INSTRUCTIONS`, and offline `paymos_auth_status`, `recommend_payment_integration` (12 CMS + widget + POS + invoices + channels), and `verify_webhook_signature` tools into `connect` (`191` tools total before login)
- ui(dashboard): unify `/developers/agents` around `npx -y @paymos/mcp setup` and direct MCP URL
- feat(mcp): connect a merchant account from Codex or Claude Code through Paymos OAuth, with Owner consent and dashboard connection management
- feat(mcp): add proof-bound `install-secret`, `upload-file`, and `download-file` helpers alongside local Sandbox

## [1.7.0] - 2026-11-19

- fix(mcp): build dist before tests in clean release preflight
- feat(mcp): universal one-command OAuth connect across AI clients
- fix(mcp): CLI --file flag for Node 22+, WebBackend PaymentChannels config, and full live E2E evidence

- feat(mcp): connect a merchant account from Codex or Claude Code through Paymos OAuth, with Owner consent and dashboard connection management
- feat(mcp): add proof-bound `install-secret`, `upload-file`, and `download-file` helpers alongside local Sandbox

## [1.6.0] - 2026-11-18

- feat(mcp): implement merchant-mcp-phase2 OAuth 2.1 host, dashboard parity, and CLI

- feat(mcp): connect a merchant account from Codex or Claude Code through Paymos OAuth, with Owner consent and dashboard connection management
- feat(mcp): add proof-bound `install-secret`, `upload-file`, and `download-file` helpers alongside local Sandbox

## [1.5.1] - 2026-11-13

- fix(plugins,publicweb): SDK webhook credit recipes, CMS recovery, redirects and CSP logs (audit 2026-11-13)

## [1.5.0] - 2026-11-07

- feat(publicweb,docs,blazor,mcp): add MCP prompt tab to code snippets and compact /contacts header
- docs(sdk): backfill published mirror changelogs across SDKs and MCP
- chore: sync Spec Forge 1.6.1, MCP integration recommendation, webhook alert hold, and social agent runs
- docs(refunds): publish merchant refunds API reference and guides across 6 locales

## [1.4.1] - 2026-11-02

- docs: regenerate merged documentation on shared node
- merge: integrate current main and shared workspace
- wip: snapshot shared working tree before merging main
- wip(refunds): merchant refund plugin work (CMS adapters, PHP SDK, tests) - unverified WIP snapshot

## [1.4.0] - 2026-11-01

- feat(mcp): add sandbox payment channel tools

## [1.3.1] - 2026-11-01

- refactor(invoices): remove the multiple-payment toggle

## [1.3.0] - 2026-10-30

- fix(plugins): reject invalid Woo refund controls and unblock SDK checks
- feat: deliver local MCP setup and accumulated platform updates
- feat(invoices): accept full late payments without reopening invoices

## [1.2.0] - 2026-10-30

- fix(plugins): reject invalid Woo refund controls and unblock SDK checks
- feat: deliver local MCP setup and accumulated platform updates
- feat(invoices): accept full late payments without reopening invoices

## [1.1.1] - 2026-10-07

- fix(mcp): repository.url/bugs с канон-кейсом Paymos-labs — npm provenance строго мэтчит регистр (E422 на v1.1.0)

## [1.1.0] - 2026-10-07

- feat(mcp): trusted publisher зарегистрирован (Paymos-labs/mcp + publish.yml) — возврат на обычный npm publish, контрольный релиз валидирует TP по OIDC

## [1.0.2] - 2026-10-07

- fix(mcp): первый релиз через npm stage publish — registry не создаёт новый пакет по голому OIDC без TP, staged-флоу с approve владельца остаётся безтокенным

## [1.0.1] - 2026-10-07

- fix(mcp): lock пересобран из registry (@paymos/sdk 2.1.1) — в lock осталась файловая ссылка resolved:../typescript-sdk с восстановления, из-за неё tsc в CI-зеркале не находил SDK (v1.0.0 тег опубликован с битым билдом, рабочий релиз — v1.0.1)

## [1.0.0] - 2026-09-28

- Initial release: local stdio MCP server for the Paymos Merchant API.
- Six tools with frozen public contracts: `create_invoice`, `get_invoice`,
  `list_invoices`, `cancel_invoice`, `simulate_invoice_payment`,
  `verify_webhook_signature`.
- Structural sandbox gate: test key pairs (`pk_test_`/`sk_test_`) only; live
  (`pk_live_`/`sk_live_`) and payout (`rk_`) keys refused at startup and on every
  call with `paymos/sandbox-only`.
- Five doc resources generated from the Paymos docs corpus at build time:
  quick-start, hosted-checkout, webhooks, testing-sandbox, server-sdks.
- Credentials via `PAYMOS_API_KEY_ID`/`PAYMOS_API_SECRET` env (flags
  `--api-key-id`/`--api-secret` as fallback); optional `PAYMOS_WEBHOOK_SECRET`.
