# @paymos/mcp — Paymos 官方 MCP 服务器与 AI 插件

[English](../README.md) | **简体中文** | [Русский](README.ru.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Türkçe](README.tr.md)

[![Paymos MCP server](https://glama.ai/mcp/servers/Paymos-labs/mcp/badge)](https://glama.ai/mcp/servers/Paymos-labs/mcp)

Paymos 官方 MCP 服务器及多平台 AI 插件封装：通过远程 Streamable HTTP OAuth 2.1 从 `Paymos-labs/mcp` 将 Paymos 原生安装到 Claude Code、OpenAI Codex、Antigravity、Gemini CLI、GitHub Copilot CLI、Cursor 或任意支持 Agent Skills 的客户端（提供 `188` 个商户工作区与沙盒 MCP 工具，无需本地 Node.js）；也可运行本地 `@paymos/mcp` CLI/stdio 桥接，获取离线文档、集成顾问、`.env`/文件辅助命令（`connect` 模式共 `191` 个工具）或基于 API 密钥的本地沙盒（`--sandbox`）。

[![观看视频：10 分钟 Paymos API 快速入门 — 从沙盒到签名 Webhook](https://i.ytimg.com/vi/aHQfHszuRBo/maxresdefault.jpg)](https://www.youtube.com/watch?v=aHQfHszuRBo)

> **视频演示（1:22，提供 6 种语言字幕）：** [在 YouTube 上观看](https://www.youtube.com/watch?v=aHQfHszuRBo)

## 以 AI 插件方式安装（推荐，无需 Node.js）

原生插件直接连接 `https://app.paymos.io/connect/merchant-mcp`，自动完成 OAuth 2.1 PKCE 与动态客户端注册（`188` 个工作区与沙盒工具），并内置 4 项跨平台 Paymos Agent Skills 及安全护栏：

| 客户端 | 安装命令 | 说明 |
|---|---|---|
| **Claude Code** | `claude plugin marketplace add Paymos-labs/mcp && claude plugin install paymos@paymos` | 在交互式会话中，也可直接运行 `/plugin marketplace add Paymos-labs/mcp` 和 `/plugin install paymos@paymos`。 |
| **OpenAI Codex** | `codex plugin marketplace add Paymos-labs/mcp` | 从 GitHub 注册插件市场；随后在 `/plugins` 中选择 **Paymos**。 |
| **Antigravity** | `agy plugin install https://github.com/Paymos-labs/mcp.git` | 自动识别并加载 `plugin.json`、`mcp_config.json`、`rules/AGENTS.md` 与 `skills/`。 |
| **Gemini CLI** | `gemini extensions install https://github.com/Paymos-labs/mcp` | 使用 `gemini-extension.json`（`httpUrl` + `oauth.enabled`）和 `rules/AGENTS.md`。 |
| **GitHub Copilot CLI** | `copilot plugin marketplace add Paymos-labs/mcp && copilot plugin install paymos@paymos` | 注册 `.github/plugin/marketplace.json` 并安装 `paymos@paymos`。 |
| **Agent Skills（30+ 款 AI 工具）** | `npx skills add Paymos-labs/mcp` | 将全部 4 项 Paymos 技能安装到 Cursor、Windsurf、OpenCode、Cline、Roo Code、Zed 等支持 Agent Skills 的客户端；搭配 `npx -y @paymos/mcp setup` 即可使用 MCP 工具。 |
| **Cursor** | `.cursor-plugin/plugin.json` + `mcp.json` + `rules/paymos.mdc` + `skills/`，或运行 `npx -y @paymos/mcp setup --client cursor` + `npx skills add Paymos-labs/mcp` | 仓库根目录同时提供原生 Cursor 插件清单、CLI 一键配置和 Agent Skills 支持。 |

### 内置 Paymos Agent Skills（`skills/`）

| 技能 | 覆盖范围 |
|---|---|
| `paymos-integrate` | 选型并实现 Paymos 稳定币支付集成（15 款官方 CMS 插件、通过显式调用 `PaymosWidget.mount()` 挂载的低代码 JS 小部件 `/v1/paymos-widget.js`、浏览器 POS 终端、托管收银台 Hosted Checkout、Host-to-Host `confirm-payment`、Telegram Bot 收银、支付通道 Payment Channels、8 款服务端 SDK），精确的资产/网络规则（4 种稳定币 `USDT`/`USDC`/`USD1`/`DAI` + 黄金锚定资产 `XAUT`，13 条入金网络 / 11 条提现网络，45 种法币计价货币），以及通过 `install-secret` 实现的零密钥暴露 `.env` 写入。 |
| `paymos-webhooks` | 基于原始请求体的 `X-Webhook-Signature` HMAC-SHA256 签名验证（支持双 `v1=` 24 小时密钥轮换窗口与 `300` 秒时间戳容差）、按 `event_id` 去重（切勿使用 `X-Webhook-Id`）、全部 18 种事件（9 种发票事件含仅作记录的 `invoice.paid_late`、3 种支付通道事件、6 种提现事件）、通过 `GET /v1/invoices/{id}` 反向核验，以及 `confirmed` + `is_final: true` 最终确认规则。 |
| `paymos-sandbox` | 通过 MCP 完成端到端沙盒模拟（`paid`、`overpaid`、`underpay`、`cancel`、`paid_late`；`confirming`、`reorged`、`confirmed` 通道充值；退款与提现），严格隔离沙盒与生产环境。 |
| `paymos-workspace` | 通过 Merchant MCP 操作 Paymos 商户工作区：角色权限基线（`Owner`/`Admin`/`Finance`/`Developer`/`Custom`）、遇到 `user_action_required` 时必须原样传递 `continue_url` 并携带 `operation_id` 重试、`otk_*`/`ftk_*` 本地辅助工具，以及仅限控制台管理的提现白名单规则。 |

> 需要离线 `paymos://docs/*` 文档页（`30` 篇预编译文档）、登录前即可使用的离线集成顾问/Webhook 验证工具、本地 `.env`/文件辅助命令（`install-secret`、`download-file`、`upload-file`），或基于密钥的本地沙盒（`--sandbox`）？请使用下方 `@paymos/mcp` CLI 配置（需要 Node.js 22.12+）。

## 快速配置（CLI 桥接与离线文档）

一条命令即可完成任意受支持 AI IDE 或 CLI 的配置，无需手动填写 API 密钥：

```bash
npx -y @paymos/mcp setup
```

`setup` 需要 **Node.js 22.12 及以上版本**，采用无密钥优先配置流程：

1. 自动检测已安装的 MCP 客户端（`antigravity`、`claude-code`、`codex`、`kimi`、`zcode`/`glm`、`cursor`、`windsurf`、`opencode`、`claude-desktop` 及项目级 `.vscode`）；若未检测到且处于交互式终端，则会提示选择（非交互式终端默认回退为 `claude-code` 和 `codex`）。
2. 先写入本地 stdio 桥接（`@paymos/mcp connect`）配置，同时保留已有服务器配置与注释。如果本地沙盒配置已占用 `paymos` 名称，Merchant MCP 会并存注册为 `paymos-merchant`。
3. 可选发起浏览器 OAuth 2.1 PKCE `S256` 登录（`[Y/n]`，权限范围为 `merchant:mcp` 和 `offline_access`）。
   - **拒绝（`n`）、传入 `--no-login` 或非交互运行：** `setup` 返回退出码 `0`，使 Paymos 就绪于**离线参考与集成顾问模式**（内置 `30` 篇预编译 `paymos://docs/*` 资源及 `paymos_auth_status`、`recommend_payment_integration`、`verify_webhook_signature`，零网络请求、不弹浏览器窗口）。
   - **同意（`Y` / 回车）：** 打开浏览器授权访问，并将 OAuth 令牌保存在 IDE 配置之外的操作系统受保护路径中（Windows 为 `%APPDATA%\Paymos\mcp\merchant-oauth.json`，Unix 为 `$XDG_CONFIG_HOME/paymos/mcp/merchant-oauth.json`）。即便取消浏览器登录或登录失败，IDE 配置仍会保留并支持离线文档模式。

在 Paymos 控制台 **Dashboard → Developers → Agents** 中可查看活跃连接、活动记录、近期操作，并随时断开连接（Disconnect）。

### 支持的客户端与示例

```bash
npx -y @paymos/mcp setup
npx -y @paymos/mcp setup --client antigravity
npx -y @paymos/mcp setup --client glm
npx -y @paymos/mcp setup --client codex
npx -y @paymos/mcp setup --client claude-code
npx -y @paymos/mcp setup --client antigravity --no-login
```

| 客户端 | `--client` 参数值 | 默认配置文件路径 |
|---|---|---|
| Codex | `codex` | `$CODEX_HOME/config.toml` 或 `~/.codex/config.toml` |
| Claude Code | `claude-code` | `~/.claude.json` |
| Claude Desktop | `claude-desktop` | Claude 的 macOS 或 Windows 配置文件 |
| Antigravity | `antigravity` | `~/.gemini/config/mcp_config.json` |
| Kimi CLI | `kimi` | `$KIMI_CODE_HOME/mcp.json` 或 `~/.kimi-code/mcp.json` |
| ZCode / GLM | `zcode`（别名 `glm`） | `~/.zcode/cli/config.json` |
| Cursor | `cursor` | `~/.cursor/mcp.json` |
| Windsurf | `windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| OpenCode | `opencode` | `OPENCODE_CONFIG`，或 `$XDG_CONFIG_HOME/opencode` / `~/.config/opencode` 下的用户配置 |
| VS Code | `vscode` | 当前目录下的 `.vscode/mcp.json` |
| 其他客户端 | `generic` | 必须显式指定 `--config PATH` |

对于 OpenCode，`setup` 会优先使用已存在的 `opencode.jsonc`，其次才是 `opencode.json`。如需为任意客户端指定其他配置文件路径，请传入 `--config PATH`。在其他操作系统上使用 Claude Desktop 时需提供显式路径。Cline、Roo Code 以及自定义客户端均可使用 `--client generic --config PATH`，并传入客户端显示的 MCP 配置文件路径。

如需在不修改文件且不登录的前提下预览拟进行的变更：

```bash
npx -y @paymos/mcp setup --client codex --dry-run
```

Kimi CLI 是一个独立的客户端，不同于 Kimi 模型本身。只要所选客户端与模型均支持工具调用（tool calling），GLM、Kimi 以及自定义模型都能通过 MCP 客户端调用 Paymos。`setup` 不会修改你的模型配置。例如，[Z.ai 文档介绍了如何在 Claude Code 中运行 GLM](https://docs.z.ai/devpack/tool/claude)；配置好模型后，使用 Claude Code 适配器添加 Paymos 即可。

### `setup` 命令选项

- `--client NAME`：`codex`、`claude-code`、`claude-desktop`、`antigravity`、`kimi`、`zcode`（或别名 `glm`）、`cursor`、`windsurf`、`opencode`、`vscode` 或 `generic`
- `--config PATH`：显式指定客户端配置文件路径（`generic` 必填）
- `--origin URL`：自定义 Paymos 源站地址（`https://...` 或本机回环 `http://127.0.0.1` / `http://localhost`，默认为 `https://app.paymos.io`）
- `--token-file PATH`：自定义 OAuth 令牌存储路径
- `--no-login`：仅写入客户端配置，不发起浏览器 OAuth 登录
- `--sandbox`：启用基于 API 密钥的本地沙盒配置（`credentials.json`）；不可与 `--origin`、`--token-file` 或 `--no-login` 同时使用
- `--credentials-file PATH`：指定独立的沙盒测试凭证文件路径（隐含启用 `--sandbox`）
- `--dry-run`：仅预览目标文件改动，不登录也不写入磁盘
- `--help`、`-h`：显示命令帮助

你也可以直接运行 `npx -y @paymos/mcp auth` 立即通过浏览器 OAuth 登录并配置客户端（支持 `--client`、`--config`、`--origin`、`--token-file`、`--no-login` 和 `--dry-run`）。

### 本地 OAuth 桥接（`connect`）

配置完成后，客户端会启动 `npx -y @paymos/mcp connect`（Windows 上为 `cmd /d /c npx -y @paymos/mcp connect`）。`connect` 的行为如下：

- 在 `initialize` 时返回 `instructions`，在 `resources/list` 和 `resources/read` 时从本地提供全部 `30` 篇预编译 `paymos://docs/*` 文档，并在 `tools/list` 时暴露 `191` 个工具（`3` 个本地离线工具 + `188` 个商户账户与沙盒工具），不会阻塞 IDE 启动。
- `paymos_auth_status`、`recommend_payment_integration` 和 `verify_webhook_signature` 100% 在本地执行，无网络请求、无浏览器弹窗。
- 仅在调用账户或沙盒 API 工具（`get_connection_status`、`merchant_*`、`playground_*`）且当前无有效会话时，才按需触发浏览器 OAuth PKCE `S256` 登录，并自动透明刷新过期的访问令牌。

### 直连 URL 连接器（云端 / 原生 OAuth 客户端）

支持通过 Streamable HTTP OAuth 2.1 + DCR 直接连接的客户端可使用以下配置：

- URL：`https://app.paymos.io/connect/merchant-mcp`
- OAuth 权限范围：`merchant:mcp` 与 `offline_access`

### 密钥与文件安全交付

商户工具可在遵循商户访问策略的前提下创建和轮换收款（Payment）与出款（Payout）API 凭证。工具不会返回明文密钥，而是返回一次性短效安装票据（installer ticket）。安装器会在目标机器上生成校验值（verifier）换取凭证，并将其直接写入指定的环境文件。

```bash
paymos install-secret --prepare --file .env --merchant-id "$PAYMOS_MERCHANT_ID" --environment production --operation-id "$PAYMOS_OPERATION_ID"
paymos install-secret --file .env --request-id "$PAYMOS_REQUEST_ID" --token "$PAYMOS_INSTALLER_TICKET"
```

将第一条命令输出的 `request_id` 和 `challenge` 作为工具的 `delivery` 入参提交（保持商户 ID、环境和 `operation_id` 一致），然后在同一台机器上用返回的票据执行第二条命令。对于私有报表导出以及暂存的 Logo 或头像上传，`download-file` 和 `upload-file` 辅助命令同样采用这套“准备—兑换（prepare-and-redeem）”流程配合 `--file` 使用；上传准备步骤还会提供文件大小、内容类型和哈希值。

提现操作遵循商户当前的策略及原生审批规则。提现白名单地址需在 Paymos 控制台中管理。

## 本地沙盒（`--sandbox`）

如果你希望使用仅针对沙盒 API 的密钥版局部 stdio 服务器，可传入 `--sandbox`（或使用 `--credentials-file` / `PAYMOS_API_*` 环境变量）。该模式提供 `15` 个工具（`recommend_payment_integration`、`verify_webhook_signature` 以及 `13` 个沙盒发票与支付通道工具）和 `5` 篇文档资源，通过 `@paymos/sdk` 使用测试收款密钥对（`pk_test_…` 与 `sk_test_…`）对 API 请求进行签名。

### 运行要求

- Node.js 22.12 及以上版本
- 一个 Paymos 商户账户，并在 **Dashboard → Developer → API Keys** 获取测试密钥对（`pk_test_…` 和 `sk_test_…`）
- 支持启动本地 stdio 服务器的 MCP 客户端

### 配置本地沙盒服务器

运行：

```bash
npx -y @paymos/mcp setup --sandbox
```

或直接指定客户端：

```bash
npx -y @paymos/mcp setup --sandbox --client codex
```

选择客户端并输入你的测试密钥对（密钥输入会被隐藏）。你还可以选择提供用于签名验证的 Webhook 密钥，或直接按回车跳过。如果环境变量中已设置相应值，`setup` 会直接读取 `PAYMOS_API_KEY_ID`、`PAYMOS_API_SECRET` 以及可选的 `PAYMOS_WEBHOOK_SECRET`。

`setup` 会将凭证单独保存，默认路径为 `$XDG_CONFIG_HOME/paymos/mcp/credentials.json`（若未设置 `XDG_CONFIG_HOME`，则为 `~/.config/paymos/mcp/credentials.json`）。可通过 `--credentials-file PATH` 指定项目目录之外的其他路径。客户端配置中仅写入指向该路径的 `PAYMOS_CREDENTIALS_FILE`，不会存放明文密钥。请勿将凭证文件纳入版本控制。

如需预览拟进行的沙盒配置改动，请运行：

```bash
npx -y @paymos/mcp setup --sandbox --client codex --dry-run
```

`--dry-run` 不会写入任何文件，也不会输出任何密钥。使用相同参数重复运行 `setup` 不会添加重复条目。如果已有的 Paymos 配置或凭证存在差异，`setup` 会拒绝覆盖以便你排查冲突。其他服务器配置、注释、模型及客户端设置均会被完整保留。如果存在内联密钥环境变量的旧版 Paymos 条目，也会触发冲突提示，`setup` 不会自动迁移。

配置完成后请重启或重新连接 MCP 客户端，即可在服务器列表中看到 Paymos。运行 `npx -y @paymos/mcp setup --help` 可查看全部选项。在非交互式终端下，`--sandbox` 必须同时指定 `--client` 及必填密钥环境变量（`PAYMOS_API_KEY_ID` 和 `PAYMOS_API_SECRET`）。

## 手动配置

对于零密钥 OAuth 桥接模式（`connect`），只需配置客户端执行 `npx -y @paymos/mcp connect`（无需 `PAYMOS_CREDENTIALS_FILE`）。若使用密钥版局部沙盒模式（`--sandbox`），请先在项目目录之外创建凭证文件：

```json
{
  "apiKeyId": "pk_test_…",
  "apiSecret": "sk_test_…",
  "webhookSecret": "whsec_…"
}
```

`webhookSecret` 为可选项。在 Unix 系统上保存后请执行 `chmod 600 /absolute/path/credentials.json`（替换为实际绝对路径）。在 Windows 上请将文件保存在个人用户目录下并确认其访问权限。在下述示例中，请将 `/absolute/path/credentials.json` 替换为文件的绝对路径（若采用 OAuth 桥接模式，则省略 `env` 并在 `args` 末尾加上 `"connect"`），同时保留已有的客户端配置。

### Claude Code、Claude Desktop、Kimi CLI、Cursor、Windsurf 及通用客户端

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

若使用带凭证文件的 `--sandbox` 模式，请将 `args` 设为 `["-y", "@paymos/mcp"]` 并添加 `"env": { "PAYMOS_CREDENTIALS_FILE": "/absolute/path/credentials.json" }`。

配置文件路径请参考上方配置表。Claude Code 同时支持项目根目录下的 `.mcp.json`。Claude Desktop 在 macOS 上的路径为 `~/Library/Application Support/Claude/claude_desktop_config.json`，在 Windows 上为 `%APPDATA%\Claude\claude_desktop_config.json`。Cline 和 Roo Code 可在 **MCP Servers → Configure** 中查看其配置文件位置。

### Codex

添加到 `config.toml`：

```toml
[mcp_servers.paymos]
command = "npx"
args = ["-y", "@paymos/mcp", "connect"]
```

`--sandbox` 模式配置：

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

添加到 `.vscode/mcp.json` 或用户级 MCP 配置：

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

Zed 需要手动配置，`setup` 不提供 Zed 适配器。在 Unix 上，全局配置位于 `~/.config/zed/settings.json`，项目配置位于 `.zed/settings.json`。在 Windows 上请在 Zed 内打开设置以定位实际的 `settings.json` 文件，然后添加：

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

在 Windows 环境下，以上所有手动配置示例均需使用如下启动方式：

```json
"command": "cmd",
"args": ["/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]
```

OpenCode 使用单个数组：`"command": ["cmd", "/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]`。Codex TOML 需设置 `command = "cmd"` 并填入相同参数数组。运行 `setup` 时会自动选择 Windows 启动器。

### 其他凭证传入方式

在 `--sandbox` 模式下，服务器仍支持直接读取环境变量 `PAYMOS_API_KEY_ID`、`PAYMOS_API_SECRET` 以及可选的 `PAYMOS_WEBHOOK_SECRET`，命令行参数 `--api-key-id` 和 `--api-secret` 也依然可用。优先级为：环境变量 > 命令行参数 > 凭证文件字段。请避免将密钥写入命令历史或受版本控制的配置文件中。

## MCP 工具列表

### `connect` 模式中的本地离线工具（`3` 个离线工具 + `188` 个商户工具 = 共 `191` 个）

| 工具 | 用途 |
|---|---|
| `paymos_auth_status` | 读取本地 Paymos OAuth 登录状态（`active`、`refreshable`、`none`）及当前源站，零网络请求、不打开浏览器 |
| `recommend_payment_integration` | 离线集成选型顾问，涵盖 `cms_plugin`（15 款官方 CMS 插件）、`checkout_widget`、`pos_terminal`、`order_checkout`、`repeat_deposits`、`both` 和 `unsure`，并提供 SDK、支持的网络/资产与 Webhook 规则说明 |
| `verify_webhook_signature` | 通过 `@paymos/sdk` 在本地对原始 Webhook 请求体校验 `X-Webhook-Signature`（支持双 `v1=` 密钥轮换；读取参数 `secret` 或 `PAYMOS_WEBHOOK_SECRET`） |

完成登录后（或在首次调用触发延迟 OAuth 后），`connect` 还会暴露 `188` 个商户账户与沙盒工具（`get_connection_status`、`merchant_*`、`playground_*`）。

### 本地沙盒（`--sandbox`）工具（共 `15` 个）

| 工具 | 用途 |
|---|---|
| `recommend_payment_integration` | 根据商户的业务收款流程推荐发票、支付通道或两者组合，说明适用原因与生命周期；信息不足时返回针对性提问而不擅自决定，并尊重商户明确指定的方案。 |
| `create_invoice` | 创建沙盒发票；按 `external_order_id` 保证幂等；返回 `payment_url` |
| `get_invoice` | 查询发票当前状态 |
| `list_invoices` | 按筛选条件分页拉取一页游标发票列表 |
| `cancel_invoice` | 取消未支付的发票并记录取消原因 |
| `simulate_invoice_payment` | 在沙盒中模拟 `paid`、`paid_late`、`overpaid`、`underpay` 或 `cancel` 场景 |
| `verify_webhook_signature` | 在本地针对原始 Webhook 请求体校验 `X-Webhook-Signature` |
| `create_payment_channel` | 创建支付通道；按 `project_id` 与 `external_id` 保证幂等 |
| `get_payment_channel` | 读取支付通道当前状态及可用充值地址 |
| `list_payment_channels` | 带筛选条件和游标分页列出支付通道 |
| `block_payment_channel` | 将支付通道状态置为已封禁（blocked） |
| `unblock_payment_channel` | 解除支付通道的封禁状态 |
| `simulate_payment_channel_deposit` | 模拟一笔新的 `confirming`、`reorged` 或 `confirmed` 通道充值 |
| `get_payment_channel_deposit` | 查询任意阶段的通道充值记录 |
| `list_payment_channel_deposits` | 按确认时间从旧到新拉取一页已确认充值记录 |

每次调用 `simulate_payment_channel_deposit` 都会生成一笔新的测试充值。充值流（deposit feed）仅返回已确认的充值。请务必保存每次响应中的 `next_cursor`（包括空页），并在下次轮询时传入。若充值流停止推进，请检查 `blocked` 字段以查看阻塞的充值记录及原因。

充值流游标有效期为 24 小时；携带该游标继续轮询时请保持 `confirmed_from` 不变。

`paid_late` 属于模拟场景，并非发票状态。具体行为请参阅[沙盒测试文档](https://paymos.io/zh-hans/docs/testing)。

工具错误统一采用 `{ "code": "paymos/<api_error_code>", "message": "…" }` 格式。沙盒限制及凭证拒绝错误分别使用 `paymos/sandbox-only`、`paymos/missing-credentials` 和 `paymos/invalid-credentials`。

## 离线文档资源

在 `connect` 模式下，构建时预编译的 `30` 篇文档页（`CONNECT_DOC_RESOURCES`）会在本地通过 `resources/list` 与 `resources/read` 直接提供，无需联网或 OAuth 登录：

- 核心接口与收银台：`paymos://docs/overview`、`paymos://docs/quick-start`、`paymos://docs/payment-flow`、`paymos://docs/hosted-checkout`、`paymos://docs/supported-currencies`、`paymos://docs/widget-sdk`、`paymos://docs/widget-terminal`、`paymos://docs/server-sdks`、`paymos://docs/api-keys`、`paymos://docs/webhooks`、`paymos://docs/webhooks-verify`、`paymos://docs/testing-sandbox`、`paymos://docs/payment-channels-create`、`paymos://docs/payment-channel-deposits-list`、`paymos://docs/errors`
- 官方 CMS 插件（`15` 篇）：`paymos://docs/cms-woocommerce`、`paymos://docs/cms-whmcs`、`paymos://docs/cms-prestashop`、`paymos://docs/cms-magento2`、`paymos://docs/cms-opencart`、`paymos://docs/cms-shopware6`、`paymos://docs/cms-cscart`、`paymos://docs/cms-easy-digital-downloads`、`paymos://docs/cms-drupal-commerce`、`paymos://docs/cms-hikashop`、`paymos://docs/cms-givewp`、`paymos://docs/cms-odoo`、`paymos://docs/cms-blesta`、`paymos://docs/cms-fossbilling`、`paymos://docs/cms-paymenter`

在 `--sandbox` 模式下，MCP 会话内提供 5 篇核心文档资源（`DOC_RESOURCES`）：

- `paymos://docs/quick-start`
- `paymos://docs/hosted-checkout`
- `paymos://docs/webhooks`
- `paymos://docs/testing-sandbox`
- `paymos://docs/server-sdks`

## 沙盒安全与凭证隔离

除浏览器 OAuth 授权期间的临时本机回环回调外，服务器不监听任何网络端口；在 `--sandbox` 模式下，服务器通过 `@paymos/sdk` 调用 Paymos 商户稳定币支付 API。`setup` 输出不会打印密钥明文。请另行核查所选客户端和模型服务商的日志留存设置。`setup` 将 OAuth 令牌与沙盒密钥存放在独立的本地文件中；在 Unix 系统上，新建的凭证与令牌文件位于私有目录内且权限为 `0600`。在 Windows 上，访问权限继承自用户主目录，`setup` 不会对文件额外加密。

在 `--sandbox` 模式下，配置阶段、服务器启动时以及工具调用时均会拒绝生产密钥（`pk_live_`/`sk_live_`）和出款密钥（`rk_…`）。在沙盒验证集成无误后，请在自己的后端应用中使用生产密钥上线。`--sandbox` 服务器始终与生产资金路径完全隔离。

## 常见问题

### Paymos MCP 如何在不向大模型暴露 API 密钥的前提下工作？
原生 AI 插件（Claude Code、OpenAI Codex、Cursor、Antigravity、Gemini CLI、GitHub Copilot CLI）通过远程 Streamable HTTP 和 OAuth 2.1 PKCE 连接 `https://app.paymos.io/connect/merchant-mcp`，提示词和 IDE 配置文件中均不存放原始 API 密钥。在本地 CLI 模式（`npx -y @paymos/mcp setup`）下，OAuth 令牌存储在工作区配置之外的系统受保护用户目录中，且 `install-secret` 可将商户密钥直接写入 `.env`，不会回显到 LLM 上下文中。

### Paymos 支持哪些加密资产和区块链网络？
Paymos 支持 **5 种资产**——4 种稳定币（**USDT、USDC、USD1、DAI**）和 1 种黄金锚定资产（**XAUT**）——覆盖 **13 条主网入金网络**（`TRC20, ERC20, BEP20, POLYGON, ARBITRUM, OPTIMISM, BASE, TON, AVAX, SOL, NEAR, SUI, PLASMA`）以及 **11 条提现网络**（`NEAR` 和 `Sui` 仅支持入金）。资金按收款原资产结算，标准收款手续费为 **1.0%**，Paymos 提现佣金为 **0%**（仅收取链上网络矿工费）。

### AI 代理能否擅自转移生产资金或绕过提现白名单？
不能。Merchant MCP 严格执行已认证用户对应的 Paymos 角色权限（`Owner`、`Admin`、`Finance`、`Developer`、`Custom`）。敏感的生产环境操作会返回 `user_action_required` 以及控制台 `continue_url`，必须由人工完成二次确认；提现地址白名单默认开启，且仅能在控制台中管理。

### 188 个远程工具与 191 个 CLI 工具有何区别？
直连远程 HTTP 端点（`https://app.paymos.io/connect/merchant-mcp`）提供 **188** 个服务端工作区与沙盒工具（`162` 个 `merchant_*`、`25` 个 `playground_*` 以及 `get_connection_status`）。运行本地 `@paymos/mcp connect` stdio 包装器后，会额外增加 **3** 个零网络离线工具（`paymos_auth_status`、`recommend_payment_integration`、`verify_webhook_signature`）和 `30` 篇预编译 `paymos://docs/*` 文档，共计 **191** 个工具。

完整文档：[Paymos MCP 与 AI 代理指南](https://paymos.io/zh-hans/docs/mcp) · [AI 代理产品页](https://paymos.io/zh-hans/product/ai-agents)

## 本地开发

```bash
npm install                 # @paymos/sdk resolves from ../typescript-sdk
npm run build:resources     # regenerate documentation resources
npm test                    # package tests
npm run build               # bundle to dist/
```

许可证：MIT — 详见 [LICENSE](../LICENSE)。
