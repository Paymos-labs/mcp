# @paymos/mcp — официальный MCP-сервер и AI-плагин Paymos

[English](../README.md) | [简体中文](README.zh-CN.md) | **Русский** | [Español](README.es.md) | [Deutsch](README.de.md) | [Türkçe](README.tr.md)

[![Paymos MCP server](https://glama.ai/mcp/servers/Paymos-labs/mcp/badge)](https://glama.ai/mcp/servers/Paymos-labs/mcp)

Официальный MCP-сервер Paymos и мультиплатформенный AI-плагин. Подключается напрямую в Claude Code, OpenAI Codex, Antigravity, Gemini CLI, GitHub Copilot CLI, Cursor и любой клиент с поддержкой Agent Skills из `Paymos-labs/mcp` по удалённому Streamable HTTP OAuth 2.1 (`188` инструментов рабочего кабинета и песочницы, без локального Node.js) — либо работает как локальный CLI/stdio-мост `@paymos/mcp` с офлайн-документацией, советником по интеграции, утилитами для `.env` и файлов (`191` инструмент в режиме `connect`) и локальной песочницей по API-ключам (`--sandbox`).

[![Видео: быстрый старт с Paymos API за 10 минут — от песочницы до подписанных вебхуков](https://i.ytimg.com/vi/aHQfHszuRBo/maxresdefault.jpg)](https://www.youtube.com/watch?v=aHQfHszuRBo)

> **Видеообзор (1:22, субтитры на 6 языках):** [Смотреть на YouTube](https://www.youtube.com/watch?v=aHQfHszuRBo)

## Установка как AI-плагин (рекомендуется, без Node.js)

Нативные плагины подключаются напрямую к `https://app.paymos.io/connect/merchant-mcp` через OAuth 2.1 PKCE и динамическую регистрацию клиента (`188` инструментов кабинета и песочницы), а вместе с ними ставят 4 кроссплатформенных скилла Paymos Agent Skills и защитные правила:

| Клиент | Команда установки | Примечания |
|---|---|---|
| **Claude Code** | `claude plugin marketplace add Paymos-labs/mcp && claude plugin install paymos@paymos` | В интерактивной сессии также работают команды `/plugin marketplace add Paymos-labs/mcp` и `/plugin install paymos@paymos`. |
| **OpenAI Codex** | `codex plugin marketplace add Paymos-labs/mcp` | Регистрирует маркетплейс с GitHub; затем выберите **Paymos** в `/plugins`. |
| **Antigravity** | `agy plugin install https://github.com/Paymos-labs/mcp.git` | Автоматически подхватывает `plugin.json`, `mcp_config.json`, `rules/AGENTS.md` и `skills/`. |
| **Gemini CLI** | `gemini extensions install https://github.com/Paymos-labs/mcp` | Использует `gemini-extension.json` (`httpUrl` + `oauth.enabled`) и `rules/AGENTS.md`. |
| **GitHub Copilot CLI** | `copilot plugin marketplace add Paymos-labs/mcp && copilot plugin install paymos@paymos` | Регистрирует `.github/plugin/marketplace.json` и устанавливает `paymos@paymos`. |
| **Agent Skills (30+ AI-инструментов)** | `npx skills add Paymos-labs/mcp` | Устанавливает все 4 скилла Paymos в Cursor, Windsurf, OpenCode, Cline, Roo Code, Zed и другие клиенты с поддержкой Agent Skills; для доступа к MCP-инструментам дополните командой `npx -y @paymos/mcp setup`. |
| **Cursor** | `.cursor-plugin/plugin.json` + `mcp.json` + `rules/paymos.mdc` + `skills/` или `npx -y @paymos/mcp setup --client cursor` + `npx skills add Paymos-labs/mcp` | В корне репозитория лежат нативные манифесты плагина Cursor вместе с CLI-настройкой и поддержкой Agent Skills. |

### Встроенные скиллы Paymos Agent Skills (`skills/`)

| Скилл | Что охватывает |
|---|---|
| `paymos-integrate` | Выбор и внедрение способов приёма платежей Paymos (15 официальных CMS-плагинов, low-code JS-виджет `/v1/paymos-widget.js` с явным `PaymosWidget.mount()`, браузерный крипто POS-терминал, Hosted Checkout, Host-to-Host `confirm-payment`, оплата в Telegram-боте, платёжные каналы, 8 серверных SDK), точные правила по активам и сетям (4 стейблкоина `USDT`/`USDC`/`USD1`/`DAI` + обеспеченный золотом `XAUT`, 13 сетей приёма / 11 сетей вывода, 45 фиатных валют) и запись секретов в `.env` через `install-secret` без попадания в контекст модели. |
| `paymos-webhooks` | Проверка подписи `X-Webhook-Signature` по алгоритму HMAC-SHA256 на сыром теле запроса (окно ротации с двумя `v1=` на 24 часа, допуск метки времени `300` с), дедупликация по `event_id` (никогда по `X-Webhook-Id`), все 18 событий (9 событий по счетам, включая информационное `invoice.paid_late`, 3 события платёжных каналов и 6 событий выводов), обратная проверка через `GET /v1/invoices/{id}` и правило финализации `confirmed` + `is_final: true`. |
| `paymos-sandbox` | Сквозная симуляция в песочнице через MCP (`paid`, `overpaid`, `underpay`, `cancel`, `paid_late`; пополнения канала `confirming`, `reorged`, `confirmed`; возвраты и выводы) со строгой изоляцией тестового и рабочего режимов. |
| `paymos-workspace` | Работа с кабинетом мерчанта Paymos через Merchant MCP: ролевая модель (`Owner`/`Admin`/`Finance`/`Developer`/`Custom`), обязательная дословная передача `continue_url` и повторный вызов с `operation_id` при `user_action_required`, локальные помощники `otk_*`/`ftk_*` и правила белого списка адресов вывода, которым управляют только из дашборда. |

> Нужны офлайн-страницы `paymos://docs/*` (`30` скомпилированных документов), офлайн-советник и проверка вебхуков до входа, локальные утилиты для `.env` и файлов (`install-secret`, `download-file`, `upload-file`) или локальная песочница по ключам (`--sandbox`)? Используйте CLI-настройку `@paymos/mcp` ниже (потребуется Node.js 22.12+).

## Быстрая настройка (CLI-мост и офлайн-документация)

Настройте любой поддерживаемый AI IDE или CLI одной командой и без API-ключей:

```bash
npx -y @paymos/mcp setup
```

Для `setup` нужен **Node.js 22.12 или новее**. Команда работает по схеме настройки без ключей:

1. Находит установленные MCP-клиенты (`antigravity`, `claude-code`, `codex`, `kimi`, `zcode`/`glm`, `cursor`, `windsurf`, `opencode`, `claude-desktop` и проектный `.vscode`), а если ничего не найдено — спрашивает в интерактивном терминале (в неинтерактивном по умолчанию выбирает `claude-code` и `codex`).
2. Сначала записывает конфигурацию локального stdio-моста (`@paymos/mcp connect`), сохраняя остальные серверы и комментарии. Если имя `paymos` уже занято локальной песочницей, Merchant MCP добавляется рядом под именем `paymos-merchant`.
3. По желанию предлагает вход через браузер по OAuth 2.1 PKCE `S256` (`[Y/n]`, области `merchant:mcp` и `offline_access`).
   - **Отказ (`n`), флаг `--no-login` или неинтерактивный запуск:** `setup` завершается с кодом `0` и оставляет Paymos в **режиме офлайн-справочника и советника по интеграции** (`30` скомпилированных ресурсов `paymos://docs/*`, а также `paymos_auth_status`, `recommend_payment_integration` и `verify_webhook_signature` — без сетевых запросов и всплывающих окон браузера).
   - **Согласие (`Y` / Enter):** открывает браузер для подтверждения доступа и сохраняет OAuth-токены вне конфигов IDE с правами доступа на уровне ОС (`%APPDATA%\Paymos\mcp\merchant-oauth.json` в Windows, `$XDG_CONFIG_HOME/paymos/mcp/merchant-oauth.json` в Unix). Даже если вход в браузере отменить или он завершится ошибкой, конфигурация IDE сохранится для офлайн-справки.

В разделе **Dashboard → Developers → Agents** видны активные подключения, журнал обращений, недавние операции и кнопка отключения (Disconnect).

### Поддерживаемые клиенты и примеры

```bash
npx -y @paymos/mcp setup
npx -y @paymos/mcp setup --client antigravity
npx -y @paymos/mcp setup --client glm
npx -y @paymos/mcp setup --client codex
npx -y @paymos/mcp setup --client claude-code
npx -y @paymos/mcp setup --client antigravity --no-login
```

| Клиент | Значение `--client` | Конфигурация по умолчанию |
|---|---|---|
| Codex | `codex` | `$CODEX_HOME/config.toml` или `~/.codex/config.toml` |
| Claude Code | `claude-code` | `~/.claude.json` |
| Claude Desktop | `claude-desktop` | Файл настроек Claude в macOS или Windows |
| Antigravity | `antigravity` | `~/.gemini/config/mcp_config.json` |
| Kimi CLI | `kimi` | `$KIMI_CODE_HOME/mcp.json` или `~/.kimi-code/mcp.json` |
| ZCode / GLM | `zcode` (алиас `glm`) | `~/.zcode/cli/config.json` |
| Cursor | `cursor` | `~/.cursor/mcp.json` |
| Windsurf | `windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| OpenCode | `opencode` | `OPENCODE_CONFIG` либо пользовательский конфиг в `$XDG_CONFIG_HOME/opencode` или `~/.config/opencode` |
| VS Code | `vscode` | `.vscode/mcp.json` в текущем каталоге |
| Другой клиент | `generic` | Требуется явный `--config PATH` |

Для OpenCode утилита сначала проверяет существующий `opencode.jsonc`, и только потом `opencode.json`. Чтобы указать другой файл для любого клиента, передайте `--config PATH`. Для Claude Desktop на других ОС путь нужно задать явно. В Cline, Roo Code и сторонних клиентах используйте `--client generic --config PATH` с тем путём к MCP-конфигу, который показывает сам клиент.

Просмотр будущих правок без изменения файлов и без входа:

```bash
npx -y @paymos/mcp setup --client codex --dry-run
```

Kimi CLI — отдельный клиент, не путайте его с самой моделью Kimi. Модели GLM, Kimi и собственные модели работают с Paymos через любой MCP-клиент, если и клиент, и модель поддерживают вызов инструментов. Команда `setup` вашу модель не меняет. Например, [в документации Z.ai показано, как запустить GLM в Claude Code](https://docs.z.ai/devpack/tool/claude); после настройки модели просто добавьте Paymos через адаптер Claude Code.

### Параметры `setup`

- `--client NAME`: `codex`, `claude-code`, `claude-desktop`, `antigravity`, `kimi`, `zcode` (или алиас `glm`), `cursor`, `windsurf`, `opencode`, `vscode` либо `generic`
- `--config PATH`: явный путь к конфигу клиента (обязателен для `generic`)
- `--origin URL`: нестандартный адрес Paymos (`https://...` или локальный `http://127.0.0.1` / `http://localhost`, по умолчанию `https://app.paymos.io`)
- `--token-file PATH`: свой путь для хранения OAuth-токенов
- `--no-login`: записать конфиг клиента без запуска OAuth-входа в браузере
- `--sandbox`: настроить локальную песочницу по API-ключам (`credentials.json`); не сочетается с `--origin`, `--token-file` и `--no-login`
- `--credentials-file PATH`: отдельный файл для тестовых ключей песочницы (автоматически включает `--sandbox`)
- `--dry-run`: показать целевые файлы без входа и без записи на диск
- `--help`, `-h`: справка по команде

Можно также вызвать `npx -y @paymos/mcp auth`, чтобы сразу войти через браузер по OAuth и прописать конфиг клиентов (поддерживаются `--client`, `--config`, `--origin`, `--token-file`, `--no-login` и `--dry-run`).

### Локальный OAuth-мост (`connect`)

Настроенные клиенты запускают `npx -y @paymos/mcp connect` (или `cmd /d /c npx -y @paymos/mcp connect` в Windows). Команда `connect`:

- Передаёт `instructions` при `initialize`, отдаёт все `30` скомпилированных страниц `paymos://docs/*` локально на `resources/list` и `resources/read` и публикует `191` инструмент (`3` локальных офлайн-инструмента + `188` инструментов кабинета и песочницы) на `tools/list`, не задерживая запуск IDE.
- Выполняет `paymos_auth_status`, `recommend_payment_integration` и `verify_webhook_signature` полностью локально — без сетевых запросов и открытия браузера.
- Запускает OAuth PKCE `S256` в браузере отложенно — только когда вызван инструмент кабинета или API песочницы (`get_connection_status`, `merchant_*`, `playground_*`) без действующей сессии, и незаметно обновляет истёкшие access-токены.

### Прямое подключение по URL (облачные и нативные OAuth-клиенты)

Клиенты с прямой поддержкой Streamable HTTP OAuth 2.1 + DCR подключаются по параметрам:

- URL: `https://app.paymos.io/connect/merchant-mcp`
- Области OAuth: `merchant:mcp` и `offline_access`

### Безопасная передача ключей и файлов

Инструменты кабинета умеют выпускать и перевыпускать ключи для приёма (Payment) и выплат (Payout) по политикам доступа мерчанта. Вместо самого секрета инструмент возвращает короткоживущий тикет установщика. Утилита на целевой машине создаёт проверочный код, обменивает тикет и записывает ключи напрямую в выбранный файл окружения.

```bash
paymos install-secret --prepare --file .env --merchant-id "$PAYMOS_MERCHANT_ID" --environment production --operation-id "$PAYMOS_OPERATION_ID"
paymos install-secret --file .env --request-id "$PAYMOS_REQUEST_ID" --token "$PAYMOS_INSTALLER_TICKET"
```

Передайте `request_id` и `challenge` из вывода первой команды в параметр `delivery` нужного инструмента с тем же идентификатором мерчанта, средой и `operation_id`. Затем на той же машине запустите вторую команду с полученным тикетом. Для приватных выгрузок и загрузки логотипа или аватара помощники `download-file` и `upload-file` работают по той же двухшаговой схеме с флагом `--file`; шаг подготовки загрузки дополнительно передаёт размер файла, MIME-тип и хеш.

Выводы подчиняются действующей политике мерчанта и правилам подтверждения. Управлять белым списком адресов вывода можно только из дашборда.

## Локальная песочница (`--sandbox`)

Если нужен локальный stdio-сервер на ключах исключительно для запросов к Sandbox API, укажите `--sandbox` (либо `--credentials-file` / переменные окружения `PAYMOS_API_*`). Он даёт `15` инструментов (`recommend_payment_integration`, `verify_webhook_signature` и `13` инструментов песочницы для счетов и платёжных каналов) плюс `5` страниц документации и подписывает запросы тестовой парой ключей приёма (`pk_test_…` и `sk_test_…`) через `@paymos/sdk`.

### Требования

- Node.js 22.12 или новее
- Аккаунт мерчанта Paymos с тестовой парой ключей из **Dashboard → Developer → API Keys** (`pk_test_…` и `sk_test_…`)
- MCP-клиент, умеющий запускать локальный stdio-сервер

### Настройка локальной песочницы

Выполните:

```bash
npx -y @paymos/mcp setup --sandbox
```

Или сразу укажите клиент:

```bash
npx -y @paymos/mcp setup --sandbox --client codex
```

Выберите клиент и введите тестовую пару ключей — ввод секрета скрыт. Дополнительно можно указать секрет вебхука для проверки подписей или нажать Enter, чтобы пропустить шаг. Если значения уже заданы в окружении, `setup` прочитает `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET` и необязательный `PAYMOS_WEBHOOK_SECRET`.

Утилита сохраняет ключи отдельно — по умолчанию в `$XDG_CONFIG_HOME/paymos/mcp/credentials.json` или `~/.config/paymos/mcp/credentials.json`, если `XDG_CONFIG_HOME` не задана. Флаг `--credentials-file PATH` позволяет выбрать другой путь за пределами проекта. В конфиг клиента попадает только переменная `PAYMOS_CREDENTIALS_FILE` с этим путём, без самих ключей. Не добавляйте файл с ключами в Git.

Предпросмотр изменений в режиме песочницы:

```bash
npx -y @paymos/mcp setup --sandbox --client codex --dry-run
```

В режиме `--dry-run` файлы не меняются, а секреты не печатаются. Повторный запуск с теми же параметрами не создаёт дубликатов. Если текущие настройки или ключи Paymos отличаются, `setup` откажется перезаписывать их, чтобы вы разобрали конфликт. Прочие серверы, комментарии, модели и параметры клиента остаются нетронутыми. Старая запись Paymos со встроенными в конфиг переменными ключей тоже вызовет конфликт — автоматической миграции нет.

Перезапустите или переподключите MCP-клиент после настройки и проверьте, что Paymos появился в списке серверов. Полный перечень флагов покажет `npx -y @paymos/mcp setup --help`. Без интерактивного терминала режиму `--sandbox` нужны флаг `--client` и обе обязательные переменные ключей (`PAYMOS_API_KEY_ID` и `PAYMOS_API_SECRET`).

## Ручная настройка

Для OAuth-моста без ключей (`connect`) достаточно настроить запуск `npx -y @paymos/mcp connect` (переменная `PAYMOS_CREDENTIALS_FILE` не нужна). Для локальной песочницы по ключам (`--sandbox`) сначала создайте файл ключей за пределами проекта:

```json
{
  "apiKeyId": "pk_test_…",
  "apiSecret": "sk_test_…",
  "webhookSecret": "whsec_…"
}
```

Поле `webhookSecret` необязательно. В Unix после сохранения выполните `chmod 600 /absolute/path/credentials.json`, подставив реальный абсолютный путь. В Windows храните файл в каталоге вашей учётной записи и проверьте права доступа к нему. В примерах ниже замените `/absolute/path/credentials.json` на реальный путь (или уберите блок `env` и допишите `"connect"` в `args` для OAuth-моста), не стирая остальные настройки клиента.

### Claude Code, Claude Desktop, Kimi CLI, Cursor, Windsurf и универсальные клиенты

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

Для режима `--sandbox` с файлом ключей передайте `"args": ["-y", "@paymos/mcp"]` и `"env": { "PAYMOS_CREDENTIALS_FILE": "/absolute/path/credentials.json" }`.

Пути конфигов указаны в таблице выше. Claude Code дополнительно читает проектный `.mcp.json`. Claude Desktop хранит настройки в `~/Library/Application Support/Claude/claude_desktop_config.json` на macOS и в `%APPDATA%\Claude\claude_desktop_config.json` на Windows. В Cline и Roo Code путь открывается через **MCP Servers → Configure**.

### Codex

Добавьте в `config.toml`:

```toml
[mcp_servers.paymos]
command = "npx"
args = ["-y", "@paymos/mcp", "connect"]
```

Для режима `--sandbox`:

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

Добавьте в `.vscode/mcp.json` или пользовательскую MCP-конфигурацию:

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

Zed настраивается вручную — адаптера для него в `setup` нет. В Unix откройте `~/.config/zed/settings.json` для общих настроек или `.zed/settings.json` для проекта. В Windows откройте настройки внутри Zed, чтобы перейти к нужному `settings.json`, и добавьте:

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

В любом ручном примере выше используйте такой запуск на Windows:

```json
"command": "cmd",
"args": ["/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]
```

В OpenCode всё передаётся одним массивом: `"command": ["cmd", "/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]`. В TOML для Codex задайте `command = "cmd"` и тот же массив аргументов. Команда `setup` выбирает Windows-обёртку сама.

### Другие способы передачи ключей

В режиме `--sandbox` сервер по-прежнему читает `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET` и необязательный `PAYMOS_WEBHOOK_SECRET` напрямую из окружения. Также сохраняются флаги `--api-key-id` и `--api-secret`. Приоритет: переменные окружения выше флагов, а флаги выше полей файла ключей. Не оставляйте секреты в истории терминала и файлах под контролем версий.

## Инструменты

### Локальные офлайн-инструменты в `connect` (`3` офлайн + `188` инструментов кабинета = `191` всего)

| Инструмент | Назначение |
|---|---|
| `paymos_auth_status` | Показывает локальный статус OAuth-входа (`active`, `refreshable`, `none`) и активный адрес без сетевых вызовов и открытия браузера |
| `recommend_payment_integration` | Офлайн-советник по выбору интеграции: `cms_plugin` (15 официальных CMS-плагинов), `checkout_widget`, `pos_terminal`, `order_checkout`, `repeat_deposits`, `both` и `unsure`, плюс SDK, поддерживаемые сети/активы и правила вебхуков |
| `verify_webhook_signature` | Проверяет `X-Webhook-Signature` по сырому телу вебхука локально через `@paymos/sdk` (поддерживает ротацию с двумя `v1=`; берёт `secret` или `PAYMOS_WEBHOOK_SECRET`) |

После входа (или при первом вызове через отложенный OAuth) в `connect` открываются ещё `188` инструментов кабинета мерчанта и песочницы (`get_connection_status`, `merchant_*`, `playground_*`).

### Инструменты локальной песочницы (`--sandbox`, всего `15`)

| Инструмент | Назначение |
|---|---|
| `recommend_payment_integration` | Рекомендует счета, платёжные каналы или оба варианта исходя из сценария приёма оплат, объясняет выбор и жизненный цикл. Если данных не хватает, задаёт точный вопрос вместо угадывания. Всегда уважает явный выбор мерчанта. |
| `create_invoice` | Создаёт тестовый счёт; идемпотентен по `external_order_id`; возвращает `payment_url` |
| `get_invoice` | Запрашивает текущее состояние счёта |
| `list_invoices` | Возвращает одну страницу счетов по курсору с фильтрами |
| `cancel_invoice` | Отменяет неоплаченный счёт с сохранением причины |
| `simulate_invoice_payment` | Симулирует `paid`, `paid_late`, `overpaid`, `underpay` или `cancel` в песочнице |
| `verify_webhook_signature` | Проверяет `X-Webhook-Signature` по сырому телу вебхука локально |
| `create_payment_channel` | Создаёт платёжный канал; идемпотентен по паре `project_id` и `external_id` |
| `get_payment_channel` | Читает текущий статус канала и доступные адреса для пополнения |
| `list_payment_channels` | Возвращает страницу платёжных каналов с фильтрами и курсором |
| `block_payment_channel` | Переводит платёжный канал в статус заблокированного |
| `unblock_payment_channel` | Снимает блокировку с платёжного канала |
| `simulate_payment_channel_deposit` | Симулирует новое пополнение в статусе `confirming`, `reorged` или `confirmed` |
| `get_payment_channel_deposit` | Читает данные пополнения на любом этапе |
| `list_payment_channel_deposits` | Возвращает страницу подтверждённых пополнений от старых к новым |

Каждый вызов `simulate_payment_channel_deposit` создаёт новое тестовое пополнение. Лента пополнений отдаёт только подтверждённые операции. Сохраняйте `next_cursor` из каждого ответа, включая пустые страницы, и передавайте его в следующий опрос. Если лента перестала двигаться, проверьте поле `blocked` — там указаны застрявшее пополнение и причина.

Курсор ленты пополнений действует 24 часа; продолжая опрос по этому курсору, не меняйте `confirmed_from`.

`paid_late` — сценарий симуляции, а не статус счёта. Подробности смотрите в [документации по песочнице](https://paymos.io/ru/docs/testing).

Ошибки инструментов возвращаются в формате `{ "code": "paymos/<api_error_code>", "message": "…" }`. Ограничения песочницы и отказы по ключам используют коды `paymos/sandbox-only`, `paymos/missing-credentials` и `paymos/invalid-credentials`.

## Ресурсы документации

В режиме `connect` при сборке вшиты `30` страниц документации (`CONNECT_DOC_RESOURCES`) — они отдаются локально через `resources/list` и `resources/read` без сети и OAuth:

- Базовые разделы и оплата: `paymos://docs/overview`, `paymos://docs/quick-start`, `paymos://docs/payment-flow`, `paymos://docs/hosted-checkout`, `paymos://docs/supported-currencies`, `paymos://docs/widget-sdk`, `paymos://docs/widget-terminal`, `paymos://docs/server-sdks`, `paymos://docs/api-keys`, `paymos://docs/webhooks`, `paymos://docs/webhooks-verify`, `paymos://docs/testing-sandbox`, `paymos://docs/payment-channels-create`, `paymos://docs/payment-channel-deposits-list`, `paymos://docs/errors`
- Официальные CMS-плагины (`15`): `paymos://docs/cms-woocommerce`, `paymos://docs/cms-whmcs`, `paymos://docs/cms-prestashop`, `paymos://docs/cms-magento2`, `paymos://docs/cms-opencart`, `paymos://docs/cms-shopware6`, `paymos://docs/cms-cscart`, `paymos://docs/cms-easy-digital-downloads`, `paymos://docs/cms-drupal-commerce`, `paymos://docs/cms-hikashop`, `paymos://docs/cms-givewp`, `paymos://docs/cms-odoo`, `paymos://docs/cms-blesta`, `paymos://docs/cms-fossbilling`, `paymos://docs/cms-paymenter`

В режиме `--sandbox` внутри MCP-сессии доступны пять страниц документации (`DOC_RESOURCES`):

- `paymos://docs/quick-start`
- `paymos://docs/hosted-checkout`
- `paymos://docs/webhooks`
- `paymos://docs/testing-sandbox`
- `paymos://docs/server-sdks`

## Песочница и безопасность ключей

Сервер не открывает сетевых портов (кроме временного локального callback-адреса на время OAuth в браузере), а в режиме `--sandbox` обращается к Merchant API через `@paymos/sdk`. Команда `setup` не выводит секреты в терминал. Отдельно проверьте настройки логирования вашего клиента и провайдера модели. OAuth-токены и ключи песочницы хранятся в отдельных локальных файлах: в Unix новые файлы создаются с правами `0600` в закрытом каталоге, а в Windows права наследуются от каталога пользователя (дополнительное шифрование `setup` не применяет).

В режиме `--sandbox` рабочие ключи (`pk_live_`/`sk_live_`) и ключи выплат (`rk_…`) отклоняются на этапе настройки, при старте сервера и при вызове инструментов. Проверив интеграцию в песочнице, запускайте уже собственное приложение с рабочими ключами — сервер `--sandbox` никогда не касается реальных платежей.

## Частые вопросы

### Как Paymos MCP работает без передачи API-ключей в LLM?
Нативные AI-плагины (Claude Code, OpenAI Codex, Cursor, Antigravity, Gemini CLI, GitHub Copilot CLI) подключаются по удалённому Streamable HTTP к `https://app.paymos.io/connect/merchant-mcp` через OAuth 2.1 PKCE — открытые API-ключи не попадают ни в промпты, ни в конфиги IDE. В локальном CLI-режиме (`npx -y @paymos/mcp setup`) OAuth-токены лежат в защищённых пользовательских каталогах ОС вне проекта, а `install-secret` записывает ключи напрямую в `.env`, не выводя их в контекст LLM.

### Какие активы и сети поддерживает Paymos?
Paymos работает с **5 активами** — четырьмя стейблкоинами (**USDT, USDC, USD1, DAI**) и токеном с золотым обеспечением (**XAUT**) — в **13 основных сетях** для входящих платежей (`TRC20, ERC20, BEP20, POLYGON, ARBITRUM, OPTIMISM, BASE, TON, AVAX, SOL, NEAR, SUI, PLASMA`) и **11 сетях** для выводов (`NEAR` и `Sui` работают только на приём). Зачисление идёт в принятом активе, стандартная комиссия на входящие платежи — **1,0 %**, комиссия Paymos за вывод — **0 %** (оплачивается только сетевой сбор блокчейна).

### Может ли AI-агент отправить реальные средства или обойти белый список адресов вывода?
Нет. Merchant MCP строго соблюдает роль авторизованного пользователя в Paymos (`Owner`, `Admin`, `Finance`, `Developer`, `Custom`). Чувствительные действия в рабочем режиме возвращают `user_action_required` со ссылкой `continue_url` на дашборд для явного подтверждения человеком, а белый список адресов вывода включён по умолчанию и редактируется только в дашборде.

### В чём разница между 188 удалёнными и 191 локальным CLI-инструментом?
Прямое удалённое HTTP-подключение (`https://app.paymos.io/connect/merchant-mcp`) открывает **188** серверных инструментов кабинета и песочницы (`162` `merchant_*`, `25` `playground_*` и `get_connection_status`). Локальная stdio-обёртка `@paymos/mcp connect` добавляет к ним **3** офлайн-инструмента без сетевых запросов (`paymos_auth_status`, `recommend_payment_integration`, `verify_webhook_signature`) и `30` скомпилированных страниц `paymos://docs/*` — итого **191** инструмент.

Полная документация: [Руководство по Paymos MCP и AI-агентам](https://paymos.io/ru/docs/mcp) · [Страница продукта AI Agents](https://paymos.io/ru/product/ai-agents)

## Разработка

```bash
npm install                 # @paymos/sdk resolves from ../typescript-sdk
npm run build:resources     # regenerate documentation resources
npm test                    # package tests
npm run build               # bundle to dist/
```

Лицензия: MIT — подробнее в [LICENSE](../LICENSE).
