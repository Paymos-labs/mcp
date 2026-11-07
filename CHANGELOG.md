# Changelog

## [Unreleased]

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
