# @paymos/mcp — Offizieller Paymos-MCP-Server und KI-Plugin

[English](../README.md) | [简体中文](README.zh-CN.md) | [Русский](README.ru.md) | [Español](README.es.md) | **Deutsch** | [Türkçe](README.tr.md)

[![Paymos MCP server](https://glama.ai/mcp/servers/Paymos-labs/mcp/badge)](https://glama.ai/mcp/servers/Paymos-labs/mcp)

Offizieller Paymos-MCP-Server und Multi-KI-Plugin-Wrapper: Installieren Sie Paymos nativ in Claude Code, OpenAI Codex, Antigravity, Gemini CLI, GitHub Copilot CLI, Cursor oder jedem Agent-Skills-Client aus `Paymos-labs/mcp` über Remote-Streamable-HTTP mit OAuth 2.1 (`188` Händler-Workspace- und Sandbox-Tools, kein lokales Node.js erforderlich) — oder nutzen Sie die lokale `@paymos/mcp` CLI-/stdio-Bridge für Offline-Dokumentation, Integrationsberatung, `.env`-/Datei-Helfer (`191` Tools insgesamt in `connect`) oder die schlüsselbasierte lokale Sandbox (`--sandbox`).

[![Video ansehen: Paymos-API-Schnellstart in 10 Minuten — Von der Sandbox bis zu signierten Webhooks](https://i.ytimg.com/vi/aHQfHszuRBo/maxresdefault.jpg)](https://www.youtube.com/watch?v=aHQfHszuRBo)

> **Video-Walkthrough (1:22, Untertitel in 6 Sprachen):** [Auf YouTube ansehen](https://www.youtube.com/watch?v=aHQfHszuRBo)

## Als KI-Plugin installieren (empfohlen — kein Node.js erforderlich)

Native Plugins verbinden sich direkt mit `https://app.paymos.io/connect/merchant-mcp` per automatischem OAuth 2.1 PKCE + Dynamic Client Registration (`188` Workspace- & Sandbox-Tools) und liefern 4 plattformübergreifende Paymos Agent Skills inklusive Schutzregeln mit:

| Client | Installationsbefehl | Hinweise |
|---|---|---|
| **Claude Code** | `claude plugin marketplace add Paymos-labs/mcp && claude plugin install paymos@paymos` | In interaktiven Sitzungen funktionieren auch `/plugin marketplace add Paymos-labs/mcp` und `/plugin install paymos@paymos`. |
| **OpenAI Codex** | `codex plugin marketplace add Paymos-labs/mcp` | Registriert den Marketplace von GitHub; wählen Sie anschließend **Paymos** unter `/plugins`. |
| **Antigravity** | `agy plugin install https://github.com/Paymos-labs/mcp.git` | Erkennt automatisch `plugin.json`, `mcp_config.json`, `rules/AGENTS.md` und `skills/`. |
| **Gemini CLI** | `gemini extensions install https://github.com/Paymos-labs/mcp` | Verwendet `gemini-extension.json` (`httpUrl` + `oauth.enabled`) und `rules/AGENTS.md`. |
| **GitHub Copilot CLI** | `copilot plugin marketplace add Paymos-labs/mcp && copilot plugin install paymos@paymos` | Registriert `.github/plugin/marketplace.json` und installiert `paymos@paymos`. |
| **Agent Skills (30+ KI-Tools)** | `npx skills add Paymos-labs/mcp` | Installiert alle 4 Paymos-Skills in Cursor, Windsurf, OpenCode, Cline, Roo Code, Zed und weiteren Agent-Skills-Clients; kombinieren Sie dies mit `npx -y @paymos/mcp setup` für MCP-Tools. |
| **Cursor** | `.cursor-plugin/plugin.json` + `mcp.json` + `rules/paymos.mdc` + `skills/` oder `npx -y @paymos/mcp setup --client cursor` + `npx skills add Paymos-labs/mcp` | Native Cursor-Plugin-Manifeste liegen im Stammverzeichnis des Repositories neben CLI-Setup und Agent-Skills-Unterstützung. |

### Enthaltene Paymos Agent Skills (`skills/`)

| Skill | Abgedeckte Bereiche |
|---|---|
| `paymos-integrate` | Auswahl und Umsetzung von Paymos-Integrationen (15 offizielle CMS-Plugins, Low-Code-JS-Widget `/v1/paymos-widget.js` mit explizitem `PaymosWidget.mount()`, Browser-POS-Terminal, Hosted Checkout, Host-to-Host `confirm-payment`, Telegram-Bot-Checkout, Payment Channels, 8 Server-SDKs), exakte Asset-/Netzwerkregeln (4 Stablecoins `USDT`/`USDC`/`USD1`/`DAI` + goldgedecktes `XAUT`, 13 Einzahlungs- / 11 Auszahlungsnetzwerke, 45 Fiat-Währungen) sowie geheimes Schreiben in `.env` über `install-secret` ohne Offenlegung von Secrets. |
| `paymos-webhooks` | HMAC-SHA256-Verifizierung von `X-Webhook-Signature` gegen den unveränderten Raw-Body (24-Stunden-Rotationsfenster mit doppeltem `v1=`, `300`-Sekunden-Toleranz), Deduplizierung über `event_id` (niemals `X-Webhook-Id`), alle 18 Ereignisse (9 Rechnungsereignisse inkl. rein informativem `invoice.paid_late`, 3 Payment-Channel-Ereignisse, 6 Auszahlungsereignisse), Gegenprüfung via `GET /v1/invoices/{id}` und Finalitätsregel `confirmed` + `is_final: true`. |
| `paymos-sandbox` | End-to-End-Sandbox-Simulation über MCP (`paid`, `overpaid`, `underpay`, `cancel`, `paid_late`; Channel-Einzahlungen `confirming`, `reorged`, `confirmed`; Rückerstattungen und Auszahlungen) mit strikter Trennung von Sandbox und Produktion. |
| `paymos-workspace` | Verwaltung eines Paymos-Händler-Workspaces über Merchant MCP: Rollen-Baselines (`Owner`/`Admin`/`Finance`/`Developer`/`Custom`), verpflichtende unveränderte Weitergabe von `continue_url` und erneuter Aufruf mit `operation_id` bei `user_action_required`, lokale `otk_*`/`ftk_*`-Helfer sowie ausschließlich im Dashboard verwaltete Auszahlungs-Whitelists. |

> Benötigen Sie Offline-Seiten unter `paymos://docs/*` (`30` vorkompilierte Dokumentationsseiten), Offline-Integrationsberatung und Webhook-Verifizierung vor dem Login, lokale `.env`-/Datei-Helfer (`install-secret`, `download-file`, `upload-file`) oder eine schlüsselbasierte lokale Sandbox (`--sandbox`)? Nutzen Sie das `@paymos/mcp` CLI-Setup weiter unten (erfordert Node.js 22.12+).

## Schnelleinrichtung (CLI-Bridge & Offline-Dokumentation)

Konfigurieren Sie jede unterstützte KI-IDE oder CLI mit einem einzigen Befehl und ohne API-Schlüssel:

```bash
npx -y @paymos/mcp setup
```

`setup` erfordert **Node.js 22.12 oder neuer** und folgt einem schlüsselfreien Setup-First-Ablauf:

1. Erkennt installierte MCP-Clients automatisch (`antigravity`, `claude-code`, `codex`, `kimi`, `zcode`/`glm`, `cursor`, `windsurf`, `opencode`, `claude-desktop` sowie `.vscode` im Projekt) oder fragt in einem interaktiven Terminal nach, falls nichts erkannt wurde (in nicht-interaktiven Terminals erfolgt ein Fallback auf `claude-code` und `codex`).
2. Schreibt zuerst die Konfiguration der lokalen stdio-Bridge (`@paymos/mcp connect`) und bewahrt bestehende Server-Einträge sowie Kommentare. Ist der Name `paymos` bereits durch eine lokale Sandbox belegt, wird Merchant MCP parallel als `paymos-merchant` eingetragen.
3. Bietet optional eine Browser-Anmeldung per OAuth 2.1 PKCE `S256` an (`[Y/n]`, Scopes `merchant:mcp` und `offline_access`).
   - **Ablehnen (`n`), `--no-login` übergeben oder nicht-interaktiv ausführen:** `setup` beendet sich mit Exit-Code `0` und hinterlässt Paymos einsatzbereit im **Offline-Referenz- & Integrationsberatungsmodus** (`30` kompilierte `paymos://docs/*`-Ressourcen plus `paymos_auth_status`, `recommend_payment_integration` und `verify_webhook_signature` ohne Netzwerkaufrufe oder Browser-Popups).
   - **Zustimmen (`Y` / Enter):** öffnet den Browser zur Freigabe und speichert OAuth-Tokens mit betriebssystemseitig geschützten Berechtigungen außerhalb der IDE-Konfiguration (`%APPDATA%\Paymos\mcp\merchant-oauth.json` unter Windows, `$XDG_CONFIG_HOME/paymos/mcp/merchant-oauth.json` unter Unix). Selbst wenn die Browser-Anmeldung abgebrochen wird oder fehlschlägt, bleibt die IDE-Konfiguration für den Offline-Referenzmodus gespeichert.

Unter **Dashboard → Developers → Agents** sehen Sie aktive Verbindungen, Aktivitäten, letzte Vorgänge und die Schaltfläche **Disconnect**.

### Unterstützte Clients und Beispiele

```bash
npx -y @paymos/mcp setup
npx -y @paymos/mcp setup --client antigravity
npx -y @paymos/mcp setup --client glm
npx -y @paymos/mcp setup --client codex
npx -y @paymos/mcp setup --client claude-code
npx -y @paymos/mcp setup --client antigravity --no-login
```

| Client | `--client`-Wert | Standardkonfiguration |
|---|---|---|
| Codex | `codex` | `$CODEX_HOME/config.toml` oder `~/.codex/config.toml` |
| Claude Code | `claude-code` | `~/.claude.json` |
| Claude Desktop | `claude-desktop` | Claude-Konfiguration unter macOS oder Windows |
| Antigravity | `antigravity` | `~/.gemini/config/mcp_config.json` |
| Kimi CLI | `kimi` | `$KIMI_CODE_HOME/mcp.json` oder `~/.kimi-code/mcp.json` |
| ZCode / GLM | `zcode` (Alias `glm`) | `~/.zcode/cli/config.json` |
| Cursor | `cursor` | `~/.cursor/mcp.json` |
| Windsurf | `windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| OpenCode | `opencode` | `OPENCODE_CONFIG` oder Benutzerkonfiguration unter `$XDG_CONFIG_HOME/opencode` bzw. `~/.config/opencode` |
| VS Code | `vscode` | `.vscode/mcp.json` im aktuellen Verzeichnis |
| Anderer Client | `generic` | Explizites `--config PATH` erforderlich |

Bei OpenCode verwendet `setup` eine vorhandene `opencode.jsonc` vor `opencode.json`. Für eine abweichende Konfigurationsdatei eines beliebigen Clients übergeben Sie `--config PATH`. Claude Desktop auf anderen Betriebssystemen erfordert einen expliziten Pfad. Cline, Roo Code und eigene Clients können `--client generic --config PATH` mit dem vom jeweiligen Client angezeigten MCP-Konfigurationspfad nutzen.

Um geplante Änderungen ohne Dateischreibvorgänge und ohne Anmeldung vorab anzuzeigen:

```bash
npx -y @paymos/mcp setup --client codex --dry-run
```

Kimi CLI ist ein eigenständiger Client und vom Kimi-Modell zu unterscheiden. GLM, Kimi und benutzerdefinierte Modelle können Paymos über einen MCP-Client nutzen, sofern sowohl Client als auch Modell Tool-Aufrufe unterstützen. `setup` ändert Ihr Modell nicht. Beispielsweise [erläutert Z.ai, wie GLM in Claude Code ausgeführt wird](https://docs.z.ai/devpack/tool/claude); fügen Sie Paymos nach der Modellkonfiguration einfach über den Claude-Code-Adapter hinzu.

### Optionen für `setup`

- `--client NAME`: `codex`, `claude-code`, `claude-desktop`, `antigravity`, `kimi`, `zcode` (oder Alias `glm`), `cursor`, `windsurf`, `opencode`, `vscode` oder `generic`
- `--config PATH`: expliziter Pfad zur Client-Konfiguration (erforderlich bei `generic`)
- `--origin URL`: benutzerdefinierter Paymos-Origin (`https://...` oder Loopback `http://127.0.0.1` / `http://localhost`, Standard `https://app.paymos.io`)
- `--token-file PATH`: eigener Speicherpfad für OAuth-Tokens
- `--no-login`: Client-Konfigurationen schreiben, ohne Browser-OAuth-Anmeldung anzubieten
- `--sandbox`: schlüsselbasierte lokale Sandbox-Einrichtung (`credentials.json`) aktivieren; nicht kombinierbar mit `--origin`, `--token-file` oder `--no-login`
- `--credentials-file PATH`: separate Datei für Sandbox-Testzugangsdaten (impliziert `--sandbox`)
- `--dry-run`: Zieldateien prüfen, ohne Anmeldung oder Schreibzugriff
- `--help`, `-h`: Befehlsübersicht anzeigen

Sie können außerdem direkt `npx -y @paymos/mcp auth` ausführen, um sich sofort per Browser-OAuth anzumelden und Clients zu konfigurieren (unterstützt `--client`, `--config`, `--origin`, `--token-file`, `--no-login` und `--dry-run`).

### Lokale OAuth-Bridge (`connect`)

Konfigurierte Clients starten `npx -y @paymos/mcp connect` (unter Windows `cmd /d /c npx -y @paymos/mcp connect`). `connect`:

- sendet `instructions` bei `initialize`, stellt alle `30` vorkompilierten `paymos://docs/*`-Seiten lokal bei `resources/list` und `resources/read` bereit und veröffentlicht `191` Tools (`3` lokale Offline-Tools + `188` Händlerkonto- und Sandbox-Tools) bei `tools/list`, ohne den Start der IDE zu blockieren;
- führt `paymos_auth_status`, `recommend_payment_integration` und `verify_webhook_signature` zu 100 % lokal ohne Netzwerkaufrufe und ohne Browser-Popups aus;
- startet Browser-OAuth PKCE `S256` erst bei Bedarf, sobald ein Konto- oder Sandbox-API-Tool (`get_connection_status`, `merchant_*`, `playground_*`) ohne gültige Sitzung aufgerufen wird, und erneuert abgelaufene Zugriffstoken transparent im Hintergrund.

### Direkte URL-Konnektoren (Cloud- / native OAuth-Clients)

Clients mit direkter Unterstützung für Streamable HTTP OAuth 2.1 + DCR verwenden:

- URL: `https://app.paymos.io/connect/merchant-mcp`
- OAuth-Scopes: `merchant:mcp` und `offline_access`

### Schlüssel- und Dateiübertragung

Die Händler-Tools können Payment- und Payout-Zugangsdaten gemäß den Zugriffsrichtlinien des Händlers erstellen und rotieren. Die Tools liefern dabei ein kurzlebiges Installer-Ticket zurück. Der Installer nutzt einen auf dem Zielrechner erzeugten Verifier, tauscht das Ticket ein und schreibt die Zugangsdaten direkt in die gewählte Umgebungsdatei.

```bash
paymos install-secret --prepare --file .env --merchant-id "$PAYMOS_MERCHANT_ID" --environment production --operation-id "$PAYMOS_OPERATION_ID"
paymos install-secret --file .env --request-id "$PAYMOS_REQUEST_ID" --token "$PAYMOS_INSTALLER_TICKET"
```

Übergeben Sie `request_id` und `challenge` aus dem ersten Befehl als `delivery`-Eingabe des Tools mit derselben Händler-ID, Umgebung und `operation_id`. Führen Sie anschließend den zweiten Befehl auf demselben Rechner mit dem erhaltenen Ticket aus. Für private Exporte sowie vorbereitete Logo- oder Avatar-Uploads nutzen `download-file` und `upload-file` denselben Prepare-and-Redeem-Ablauf mit `--file`. Die Upload-Vorbereitung liefert zusätzlich Dateigröße, Content-Type und Hash.

Auszahlungen folgen der aktuellen Händlerrichtlinie und den nativen Freigaberegeln. Verwalten Sie Whitelist-Adressen für Auszahlungen ausschließlich im Dashboard.

## Lokale Sandbox (`--sandbox`)

Wenn Sie einen schlüsselbasierten lokalen stdio-Server ausschließlich für Sandbox-API-Aufrufe bevorzugen, übergeben Sie `--sandbox` (oder `--credentials-file` bzw. `PAYMOS_API_*`-Umgebungsvariablen). Er bietet `15` Tools (`recommend_payment_integration`, `verify_webhook_signature` sowie `13` Sandbox-Tools für Rechnungen und Payment Channels) plus `5` Dokumentationsressourcen und signiert API-Anfragen mit einem Test-Payment-Schlüsselpaar (`pk_test_…` und `sk_test_…`) über `@paymos/sdk`.

### Voraussetzungen

- Node.js 22.12 oder neuer
- Ein Paymos-Händlerkonto mit Test-Schlüsselpaar aus **Dashboard → Developer → API Keys** (`pk_test_…` und `sk_test_…`)
- Ein MCP-Client, der einen lokalen stdio-Server starten kann

### Lokalen Sandbox-Server einrichten

Führen Sie aus:

```bash
npx -y @paymos/mcp setup --sandbox
```

Oder geben Sie den Client direkt an:

```bash
npx -y @paymos/mcp setup --sandbox --client codex
```

Wählen Sie Ihren Client und geben Sie Ihr Test-Schlüsselpaar ein (die Eingabe des Secrets bleibt verborgen). Optional können Sie ein Webhook-Secret zur Signaturprüfung hinterlegen oder mit Enter überspringen. Sind die Werte bereits in Ihrer Umgebung gesetzt, liest `setup` automatisch `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET` und optional `PAYMOS_WEBHOOK_SECRET`.

`setup` speichert Zugangsdaten getrennt, standardmäßig unter `$XDG_CONFIG_HOME/paymos/mcp/credentials.json` bzw. `~/.config/paymos/mcp/credentials.json`, falls `XDG_CONFIG_HOME` nicht gesetzt ist. Mit `--credentials-file PATH` wählen Sie einen anderen Speicherort außerhalb Ihres Projekts. Der Client-Eintrag enthält ausschließlich `PAYMOS_CREDENTIALS_FILE` mit diesem Pfad — niemals Ihre Schlüssel. Nehmen Sie die Credentials-Datei nicht in die Versionskontrolle auf.

Um geplante Sandbox-Änderungen vorab anzuzeigen:

```bash
npx -y @paymos/mcp setup --sandbox --client codex --dry-run
```

`--dry-run` schreibt keine Dateien und gibt keine Secrets aus. Wiederholtes Ausführen mit identischen Angaben erzeugt keinen doppelten Eintrag. Weichen vorhandene Paymos-Einstellungen oder Zugangsdaten ab, verweigert `setup` das Überschreiben, damit Sie den Konflikt prüfen können. Andere Server, Kommentare, Modelle und Client-Einstellungen bleiben erhalten. Ein älterer Paymos-Eintrag mit Inline-Umgebungsvariablen für Schlüssel verursacht ebenfalls einen Konflikt und wird nicht automatisch migriert.

Starten oder verbinden Sie Ihren MCP-Client nach dem Setup neu und suchen Sie Paymos in der Serverliste. Alle Optionen listet `npx -y @paymos/mcp setup --help` auf. Ohne interaktives Terminal erfordert `--sandbox` die Option `--client` sowie die Pflicht-Umgebungsvariablen (`PAYMOS_API_KEY_ID` und `PAYMOS_API_SECRET`).

## Manuelle Konfiguration

Für den schlüsselfreien OAuth-Bridge-Modus (`connect`) konfigurieren Sie Ihren Client einfach für `npx -y @paymos/mcp connect` (kein `PAYMOS_CREDENTIALS_FILE` erforderlich). Für die schlüsselbasierte lokale Sandbox (`--sandbox`) legen Sie zunächst eine Zugangsdatendatei außerhalb des Projekts an:

```json
{
  "apiKeyId": "pk_test_…",
  "apiSecret": "sk_test_…",
  "webhookSecret": "whsec_…"
}
```

`webhookSecret` ist optional. Führen Sie unter Unix nach dem Speichern `chmod 600 /absolute/path/credentials.json` mit dem tatsächlichen absoluten Pfad aus. Speichern Sie die Datei unter Windows in Ihrem Benutzerverzeichnis und prüfen Sie deren bestehende Zugriffsrechte. Ersetzen Sie in den folgenden Beispielen `/absolute/path/credentials.json` durch den echten absoluten Pfad (oder lassen Sie `env` weg und hängen `"connect"` an `args` für den OAuth-Bridge-Modus an) und behalten Sie Ihre vorhandenen Client-Einstellungen bei.

### Claude Code, Claude Desktop, Kimi CLI, Cursor, Windsurf und generische Clients

```json
{
  "mcpServers": {
    "paymos": {
      "command": "npx",
      "args": ["-y", "@paymos/mcp", "connect"]
    }
  }
}
```

Für den `--sandbox`-Modus mit Zugangsdatendatei übergeben Sie `"args": ["-y", "@paymos/mcp"]` und `"env": { "PAYMOS_CREDENTIALS_FILE": "/absolute/path/credentials.json" }`.

Verwenden Sie die Pfade aus der obigen Übersichtstabelle. Claude Code akzeptiert zusätzlich eine projektbezogene `.mcp.json`. Claude Desktop nutzt unter macOS `~/Library/Application Support/Claude/claude_desktop_config.json` und unter Windows `%APPDATA%\Claude\claude_desktop_config.json`. Cline und Roo Code zeigen ihre Konfiguration unter **MCP Servers → Configure** an.

### Codex

In `config.toml` eintragen:

```toml
[mcp_servers.paymos]
command = "npx"
args = ["-y", "@paymos/mcp", "connect"]
```

Für den `--sandbox`-Modus:

```toml
[mcp_servers.paymos]
command = "npx"
args = ["-y", "@paymos/mcp"]

[mcp_servers.paymos.env]
PAYMOS_CREDENTIALS_FILE = "/absolute/path/credentials.json"
```

### OpenCode

```json
{
  "mcp": {
    "paymos": {
      "type": "local",
      "command": ["npx", "-y", "@paymos/mcp", "connect"],
      "enabled": true
    }
  }
}
```

### VS Code

In `.vscode/mcp.json` oder Ihrer Benutzer-MCP-Konfiguration ergänzen:

```json
{
  "servers": {
    "paymos": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@paymos/mcp", "connect"]
    }
  }
}
```

### Zed

Zed erfordert eine manuelle Konfiguration; `setup` besitzt keinen Zed-Adapter. Unter Unix nutzen Sie `~/.config/zed/settings.json` für globale Einstellungen oder `.zed/settings.json` für ein Projekt. Unter Windows öffnen Sie die Einstellungen in Zed, um die aktive `settings.json` zu finden, und ergänzen:

```json
{
  "context_servers": {
    "paymos": {
      "command": "npx",
      "args": ["-y", "@paymos/mcp", "connect"]
    }
  }
}
```

### Windows

Verwenden Sie unter Windows bei jedem manuellen Beispiel diesen Launcher:

```json
"command": "cmd",
"args": ["/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]
```

OpenCode nutzt ein einzelnes Array: `"command": ["cmd", "/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]`. In Codex-TOML setzen Sie `command = "cmd"` mit demselben Argument-Array. `setup` wählt den Windows-Launcher automatisch aus.

### Weitere Optionen für Zugangsdaten

Im `--sandbox`-Modus liest der Server weiterhin direkt `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET` und optional `PAYMOS_WEBHOOK_SECRET`. Die Flags `--api-key-id` und `--api-secret` bleiben ebenfalls verfügbar. Umgebungsvariablen haben Vorrang vor Flags, diese wiederum vor Feldern aus der Zugangsdatendatei. Vermeiden Sie Secrets im Befehlsverlauf oder in versionierten Konfigurationsdateien.

## Tools

### Lokale Offline-Tools in `connect` (`3` Offline-Tools + `188` Händler-Tools = `191` insgesamt)

| Tool | Zweck |
|---|---|
| `paymos_auth_status` | Liest den lokalen Paymos-OAuth-Anmeldestatus (`active`, `refreshable`, `none`) und den aktiven Origin ohne Netzwerkaufrufe oder Browser-Start |
| `recommend_payment_integration` | Offline-Integrationsberater für `cms_plugin` (15 offizielle CMS-Plugins), `checkout_widget`, `pos_terminal`, `order_checkout`, `repeat_deposits`, `both` und `unsure`, inkl. SDKs, unterstützter Netzwerke/Assets und Webhook-Regeln |
| `verify_webhook_signature` | Prüft `X-Webhook-Signature` lokal gegen den Raw-Webhook-Body mittels `@paymos/sdk` (unterstützt Dual-`v1=`-Secret-Rotation; nutzt `secret` oder `PAYMOS_WEBHOOK_SECRET`) |

Nach der Anmeldung (oder beim ersten Aufruf nach Lazy-OAuth) stellt `connect` zusätzlich `188` Händlerkonto- und Sandbox-Tools (`get_connection_status`, `merchant_*`, `playground_*`) bereit.

### Lokale Sandbox-Tools (`--sandbox`, insgesamt `15`)

| Tool | Zweck |
|---|---|
| `recommend_payment_integration` | Empfiehlt Rechnungen, Payment Channels oder beides anhand des Zahlungsablaufs des Händlers. Erläutert Eignung und relevanten Lebenszyklus. Fehlen Angaben, stellt das Tool eine gezielte Rückfrage statt zu raten. Eine explizite Vorgabe des Händlers wird stets respektiert. |
| `create_invoice` | Erstellt eine Sandbox-Rechnung; idempotent pro `external_order_id`; gibt `payment_url` zurück |
| `get_invoice` | Ruft den aktuellen Rechnungsstatus ab |
| `list_invoices` | Ruft eine Cursor-Seite von Rechnungen mit Filtern ab |
| `cancel_invoice` | Storniert eine unbezahlte Rechnung und speichert den Grund |
| `simulate_invoice_payment` | Simuliert `paid`, `paid_late`, `overpaid`, `underpay` oder `cancel` in der Sandbox |
| `verify_webhook_signature` | Verifiziert `X-Webhook-Signature` lokal gegen den Raw-Webhook-Body |
| `create_payment_channel` | Erstellt einen Payment Channel; idempotent pro `project_id` und `external_id` |
| `get_payment_channel` | Liest den aktuellen Status eines Channels und verfügbare Einzahlungsadressen |
| `list_payment_channels` | Listet eine Seite von Payment Channels mit Filtern und Cursor auf |
| `block_payment_channel` | Setzt den Status eines Payment Channels auf gesperrt (`blocked`) |
| `unblock_payment_channel` | Hebt die Sperrung eines Payment Channels auf |
| `simulate_payment_channel_deposit` | Simuliert eine neue Einzahlung im Status `confirming`, `reorged` oder `confirmed` |
| `get_payment_channel_deposit` | Ruft eine Einzahlung in jedem beliebigen Status ab |
| `list_payment_channel_deposits` | Liest eine Seite bestätigter Einzahlungen, älteste zuerst |

Jeder Aufruf von `simulate_payment_channel_deposit` erzeugt eine neue Test-Einzahlung. Der Einzahlungs-Feed gibt ausschließlich bestätigte Einzahlungen zurück. Speichern Sie `next_cursor` aus jeder Antwort — auch bei leeren Seiten — und übergeben Sie ihn beim nächsten Abruf. Bleibt der Feed stehen, prüfen Sie `blocked` auf die blockierende Einzahlung samt Ursache.

Ein Cursor des Einzahlungs-Feeds ist 24 Stunden gültig; lassen Sie `confirmed_from` unverändert, wenn Sie mit diesem Cursor fortfahren.

`paid_late` ist ein Simulationsszenario und kein Rechnungsstatus. Details zum Verhalten finden Sie in der [Sandbox-Dokumentation](https://paymos.io/de/docs/testing).

Tool-Fehler folgen dem Format `{ "code": "paymos/<api_error_code>", "message": "…" }`. Sandbox- und Zugangsdaten-Ablehnungen verwenden `paymos/sandbox-only`, `paymos/missing-credentials` und `paymos/invalid-credentials`.

## Ressourcen

Im Modus `connect` werden `30` zur Build-Zeit kompilierte Dokumentationsseiten (`CONNECT_DOC_RESOURCES`) lokal über `resources/list` und `resources/read` ohne Netzwerkzugriff oder OAuth bereitgestellt:

- Kernfunktionen & Checkout: `paymos://docs/overview`, `paymos://docs/quick-start`, `paymos://docs/payment-flow`, `paymos://docs/hosted-checkout`, `paymos://docs/supported-currencies`, `paymos://docs/widget-sdk`, `paymos://docs/widget-terminal`, `paymos://docs/server-sdks`, `paymos://docs/api-keys`, `paymos://docs/webhooks`, `paymos://docs/webhooks-verify`, `paymos://docs/testing-sandbox`, `paymos://docs/payment-channels-create`, `paymos://docs/payment-channel-deposits-list`, `paymos://docs/errors`
- Offizielle CMS-Plugins (`15`): `paymos://docs/cms-woocommerce`, `paymos://docs/cms-whmcs`, `paymos://docs/cms-prestashop`, `paymos://docs/cms-magento2`, `paymos://docs/cms-opencart`, `paymos://docs/cms-shopware6`, `paymos://docs/cms-cscart`, `paymos://docs/cms-easy-digital-downloads`, `paymos://docs/cms-drupal-commerce`, `paymos://docs/cms-hikashop`, `paymos://docs/cms-givewp`, `paymos://docs/cms-odoo`, `paymos://docs/cms-blesta`, `paymos://docs/cms-fossbilling`, `paymos://docs/cms-paymenter`

Im Modus `--sandbox` stehen innerhalb der MCP-Sitzung fünf Dokumentationsseiten (`DOC_RESOURCES`) bereit:

- `paymos://docs/quick-start`
- `paymos://docs/hosted-checkout`
- `paymos://docs/webhooks`
- `paymos://docs/testing-sandbox`
- `paymos://docs/server-sdks`

## Sandbox und Zugangsdaten

Der Server öffnet keinen Netzwerk-Listener (abgesehen vom temporären Loopback-Callback während der Browser-OAuth-Anmeldung) und ruft im `--sandbox`-Modus die Merchant API über `@paymos/sdk` auf. Die Ausgabe von `setup` gibt keine Geheimnisse aus. Prüfen Sie die Protokollierungseinstellungen Ihres gewählten Clients und Modellanbieters separat. `setup` speichert OAuth-Tokens und Sandbox-Schlüssel in getrennten lokalen Dateien; unter Unix erhalten neue Credentials- und Token-Dateien die Berechtigung `0600` in einem privaten Verzeichnis. Unter Windows greifen die Berechtigungen des Benutzerverzeichnisses; eine zusätzliche Verschlüsselung durch `setup` erfolgt nicht.

Im Modus `--sandbox` werden Live-Schlüssel (`pk_live_`/`sk_live_`) und Payout-Schlüssel (`rk_…`) bereits beim Setup, beim Serverstart und bei Tool-Aufrufen abgelehnt. Nach dem Testen Ihrer Integration in der Sandbox betreiben Sie Ihre eigene Anwendung mit deren Live-Schlüsseln. Der `--sandbox`-Server bleibt strikt außerhalb produktiver Zahlungswege.

## Häufig gestellte Fragen

### Wie arbeitet Paymos MCP, ohne API-Schlüssel gegenüber dem LLM offenzulegen?
Native KI-Plugins (Claude Code, OpenAI Codex, Cursor, Antigravity, Gemini CLI, GitHub Copilot CLI) verbinden sich per Remote Streamable HTTP mit `https://app.paymos.io/connect/merchant-mcp` über OAuth 2.1 PKCE — in Prompts oder IDE-Konfigurationen werden keine rohen API-Schlüssel gespeichert. Im lokalen CLI-Modus (`npx -y @paymos/mcp setup`) liegen OAuth-Tokens in betriebssystemseitig geschützten Benutzerverzeichnissen außerhalb des Projekts, und `install-secret` schreibt Händlerschlüssel direkt in `.env`, ohne sie in den LLM-Kontext auszugeben.

### Welche Kryptowährungen und Netzwerke unterstützt Paymos?
Paymos unterstützt **5 Assets** — vier Stablecoins (**USDT, USDC, USD1, DAI**) und ein goldgedecktes Asset (**XAUT**) — in **13 Mainnet-Netzwerken** für eingehende Zahlungen (`TRC20, ERC20, BEP20, POLYGON, ARBITRUM, OPTIMISM, BASE, TON, AVAX, SOL, NEAR, SUI, PLASMA`) sowie **11 Netzwerken** für Auszahlungen (`NEAR` und `Sui` sind reine Einzahlungsnetzwerke). Die Gutschrift erfolgt im akzeptierten Asset bei **1,0 %** Standardgebühr für eingehende Zahlungen und **0 %** Paymos-Auszahlungsgebühr (nur Netzwerkgebühren).

### Kann ein KI-Agent echte Guthaben bewegen oder Auszahlungs-Whitelists umgehen?
Nein. Merchant MCP setzt exakt die Paymos-Rolle des authentifizierten Benutzers durch (`Owner`, `Admin`, `Finance`, `Developer`, `Custom`). Sensible Produktionsaktionen geben `user_action_required` zusammen mit einer Dashboard-`continue_url` zur expliziten Bestätigung durch einen Menschen zurück, und die Whitelist für Auszahlungsadressen ist standardmäßig aktiv und wird ausschließlich im Dashboard verwaltet.

### Was ist der Unterschied zwischen 188 Remote-Tools und 191 CLI-Tools?
Direkte Remote-HTTP-Verbindungen (`https://app.paymos.io/connect/merchant-mcp`) stellen **188** serverseitige Workspace- und Sandbox-Tools bereit (`162` `merchant_*`, `25` `playground_*` und `get_connection_status`). Der lokale stdio-Wrapper `@paymos/mcp connect` ergänzt **3** netzwerkfreie Offline-Helfer (`paymos_auth_status`, `recommend_payment_integration`, `verify_webhook_signature`) sowie `30` kompilierte `paymos://docs/*`-Seiten — insgesamt **191** Tools.

Vollständige Dokumentation: [Paymos MCP & KI-Agenten-Leitfaden](https://paymos.io/de/docs/mcp) · [Produktseite AI Agents](https://paymos.io/de/product/ai-agents)

## Entwicklung

```bash
npm install                 # @paymos/sdk resolves from ../typescript-sdk
npm run build:resources     # regenerate documentation resources
npm test                    # package tests
npm run build               # bundle to dist/
```

Lizenz: MIT — siehe [LICENSE](../LICENSE).
