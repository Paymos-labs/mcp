# @paymos/mcp — Servidor MCP oficial y complemento de IA de Paymos

[English](../README.md) | [简体中文](README.zh-CN.md) | [Русский](README.ru.md) | **Español** | [Deutsch](README.de.md) | [Türkçe](README.tr.md)

[![Paymos MCP server](https://glama.ai/mcp/servers/Paymos-labs/mcp/badge)](https://glama.ai/mcp/servers/Paymos-labs/mcp)

Servidor MCP oficial de Paymos y envoltorio de complementos multi-IA: instala Paymos de forma nativa en Claude Code, OpenAI Codex, Antigravity, Gemini CLI, GitHub Copilot CLI, Cursor o cualquier cliente compatible con Agent Skills desde `Paymos-labs/mcp` mediante Streamable HTTP OAuth 2.1 remoto (`188` herramientas de espacio de trabajo y Sandbox, sin necesidad de Node.js local), o ejecuta el puente local CLI/stdio `@paymos/mcp` para documentación sin conexión, asesor de integración, asistentes de `.env`/archivos (`191` herramientas en total en `connect`) o Sandbox local basado en claves (`--sandbox`).

[![Ver vídeo: Inicio rápido de la API de Paymos en 10 minutos — Del Sandbox a los webhooks firmados](https://i.ytimg.com/vi/aHQfHszuRBo/maxresdefault.jpg)](https://www.youtube.com/watch?v=aHQfHszuRBo)

> **Recorrido en vídeo (1:22, subtítulos en 6 idiomas):** [Ver en YouTube](https://www.youtube.com/watch?v=aHQfHszuRBo)

## Instalar como complemento de IA (recomendado — sin Node.js)

Los complementos nativos se conectan directamente a `https://app.paymos.io/connect/merchant-mcp` con OAuth 2.1 PKCE automático + Registro Dinámico de Clientes (`188` herramientas de espacio de trabajo y Sandbox) e incluyen 4 Agent Skills multiplataforma de Paymos junto con reglas de seguridad:

| Cliente | Comando de instalación | Notas |
|---|---|---|
| **Claude Code** | `claude plugin marketplace add Paymos-labs/mcp && claude plugin install paymos@paymos` | En sesiones interactivas también funcionan `/plugin marketplace add Paymos-labs/mcp` y `/plugin install paymos@paymos`. |
| **OpenAI Codex** | `codex plugin marketplace add Paymos-labs/mcp` | Registra el marketplace desde GitHub; luego selecciona **Paymos** en `/plugins`. |
| **Antigravity** | `agy plugin install https://github.com/Paymos-labs/mcp.git` | Detecta automáticamente `plugin.json`, `mcp_config.json`, `rules/AGENTS.md` y `skills/`. |
| **Gemini CLI** | `gemini extensions install https://github.com/Paymos-labs/mcp` | Utiliza `gemini-extension.json` (`httpUrl` + `oauth.enabled`) y `rules/AGENTS.md`. |
| **GitHub Copilot CLI** | `copilot plugin marketplace add Paymos-labs/mcp && copilot plugin install paymos@paymos` | Registra `.github/plugin/marketplace.json` e instala `paymos@paymos`. |
| **Agent Skills (más de 30 herramientas de IA)** | `npx skills add Paymos-labs/mcp` | Instala las 4 skills de Paymos en Cursor, Windsurf, OpenCode, Cline, Roo Code, Zed y otros clientes compatibles con Agent Skills; combínalo con `npx -y @paymos/mcp setup` para acceder a las herramientas MCP. |
| **Cursor** | `.cursor-plugin/plugin.json` + `mcp.json` + `rules/paymos.mdc` + `skills/`, o `npx -y @paymos/mcp setup --client cursor` + `npx skills add Paymos-labs/mcp` | Los manifiestos nativos del complemento de Cursor viven en la raíz del repositorio junto con la configuración CLI y el soporte de Agent Skills. |

### Paymos Agent Skills incluidas (`skills/`)

| Skill | Qué cubre |
|---|---|
| `paymos-integrate` | Elección e implementación de integraciones con Paymos (15 complementos oficiales de CMS, widget JS low-code `/v1/paymos-widget.js` con `PaymosWidget.mount()` explícito, terminal POS en navegador, Hosted Checkout, Host-to-Host `confirm-payment`, checkout por Telegram Bot, canales de pago, 8 SDKs de servidor), reglas exactas de activos y redes (4 stablecoins `USDT`/`USDC`/`USD1`/`DAI` + `XAUT` respaldado por oro, 13 redes de depósito / 11 redes de retiro, 45 divisas fiduciarias) y escritura en `.env` sin exponer secretos mediante `install-secret`. |
| `paymos-webhooks` | Verificación HMAC-SHA256 de `X-Webhook-Signature` sobre el cuerpo sin procesar (ventanas de rotación de 24 horas con doble `v1=`, tolerancia de `300` s), deduplicación por `event_id` (nunca `X-Webhook-Id`), los 18 eventos (9 de factura incluyendo `invoice.paid_late` solo informativo, 3 de canales de pago, 6 de retiros), verificación inversa mediante `GET /v1/invoices/{id}` y finalidad `confirmed` + `is_final: true`. |
| `paymos-sandbox` | Simulación Sandbox de extremo a extremo por MCP (`paid`, `overpaid`, `underpay`, `cancel`, `paid_late`; depósitos de canal `confirming`, `reorged`, `confirmed`; reembolsos y retiros) con aislamiento estricto entre Sandbox y Producción. |
| `paymos-workspace` | Operación de un espacio de trabajo comercial en Paymos mediante Merchant MCP: roles base (`Owner`/`Admin`/`Finance`/`Developer`/`Custom`), entrega literal obligatoria de `continue_url` y reintento con `operation_id` ante `user_action_required`, asistentes locales `otk_*`/`ftk_*` y reglas de lista blanca de direcciones de retiro administradas exclusivamente desde el panel. |

> ¿Necesitas páginas sin conexión `paymos://docs/*` (`30` documentos compilados), herramientas locales de asesoría y verificación de webhooks antes de iniciar sesión, utilidades locales para `.env`/archivos (`install-secret`, `download-file`, `upload-file`) o un Sandbox local con claves (`--sandbox`)? Usa la configuración CLI de `@paymos/mcp` más abajo (requiere Node.js 22.12+).

## Configuración rápida (puente CLI y documentación sin conexión)

Configura cualquier IDE o CLI de IA compatible con un solo comando y sin claves de API:

```bash
npx -y @paymos/mcp setup
```

`setup` requiere **Node.js 22.12 o superior** y ejecuta un flujo sin claves orientado a la configuración inicial:

1. Detecta automáticamente los clientes MCP instalados (`antigravity`, `claude-code`, `codex`, `kimi`, `zcode`/`glm`, `cursor`, `windsurf`, `opencode`, `claude-desktop` y `.vscode` del proyecto), o pregunta en una terminal interactiva si no encuentra ninguno (en terminales no interactivas usa `claude-code` y `codex` como respaldo).
2. Escribe primero la configuración del puente local stdio (`@paymos/mcp connect`), preservando otros servidores y comentarios. Si una entrada de Sandbox local ya ocupa el nombre `paymos`, Merchant MCP se configura en paralelo como `paymos-merchant`.
3. Opcionalmente ofrece inicio de sesión OAuth 2.1 PKCE `S256` en el navegador (`[Y/n]`, alcances `merchant:mcp` y `offline_access`).
   - **Rechazar (`n`), pasar `--no-login` o ejecutar en modo no interactivo:** `setup` termina con código `0` y deja Paymos listo en **modo de referencia sin conexión y asesor de integración** (`30` recursos compilados `paymos://docs/*` + `paymos_auth_status`, `recommend_payment_integration` y `verify_webhook_signature`, sin llamadas de red ni ventanas emergentes del navegador).
   - **Aceptar (`Y` / Intro):** abre tu navegador para aprobar el acceso y almacena los tokens OAuth con permisos protegidos por el sistema operativo fuera de las configuraciones del IDE (`%APPDATA%\Paymos\mcp\merchant-oauth.json` en Windows, `$XDG_CONFIG_HOME/paymos/mcp/merchant-oauth.json` en Unix). Incluso si cancelas o falla el inicio de sesión en el navegador, la configuración de tu IDE permanece guardada para el modo de referencia sin conexión.

En **Dashboard → Developers → Agents** puedes consultar las conexiones activas, la actividad, las operaciones recientes y desconectar sesiones (**Disconnect**).

### Clientes compatibles y ejemplos

```bash
npx -y @paymos/mcp setup
npx -y @paymos/mcp setup --client antigravity
npx -y @paymos/mcp setup --client glm
npx -y @paymos/mcp setup --client codex
npx -y @paymos/mcp setup --client claude-code
npx -y @paymos/mcp setup --client antigravity --no-login
```

| Cliente | Valor de `--client` | Configuración predeterminada |
|---|---|---|
| Codex | `codex` | `$CODEX_HOME/config.toml` o `~/.codex/config.toml` |
| Claude Code | `claude-code` | `~/.claude.json` |
| Claude Desktop | `claude-desktop` | Archivo de configuración de Claude en macOS o Windows |
| Antigravity | `antigravity` | `~/.gemini/config/mcp_config.json` |
| Kimi CLI | `kimi` | `$KIMI_CODE_HOME/mcp.json` o `~/.kimi-code/mcp.json` |
| ZCode / GLM | `zcode` (alias `glm`) | `~/.zcode/cli/config.json` |
| Cursor | `cursor` | `~/.cursor/mcp.json` |
| Windsurf | `windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| OpenCode | `opencode` | `OPENCODE_CONFIG`, o la configuración de usuario en `$XDG_CONFIG_HOME/opencode` o `~/.config/opencode` |
| VS Code | `vscode` | `.vscode/mcp.json` en el directorio actual |
| Otro cliente | `generic` | Requiere `--config PATH` explícito |

Para OpenCode, `setup` usa un `opencode.jsonc` existente antes que `opencode.json`. Para usar un archivo de configuración distinto en cualquier cliente, pasa `--config PATH`. Claude Desktop en otros sistemas operativos requiere una ruta explícita. Cline, Roo Code y clientes personalizados pueden usar `--client generic --config PATH` con la ruta de configuración MCP que indique cada cliente.

Para previsualizar los cambios propuestos sin modificar archivos ni iniciar sesión:

```bash
npx -y @paymos/mcp setup --client codex --dry-run
```

Kimi CLI es un cliente, distinto del modelo Kimi. Los modelos GLM, Kimi y personalizados pueden usar Paymos mediante un cliente MCP siempre que tanto el cliente como el modelo admitan llamadas a herramientas (*tool calling*). `setup` no cambia tu modelo. Por ejemplo, [Z.ai explica cómo ejecutar GLM en Claude Code](https://docs.z.ai/devpack/tool/claude); añade Paymos con el adaptador de Claude Code después de configurar el modelo.

### Opciones de `setup`

- `--client NAME`: `codex`, `claude-code`, `claude-desktop`, `antigravity`, `kimi`, `zcode` (o alias `glm`), `cursor`, `windsurf`, `opencode`, `vscode` o `generic`
- `--config PATH`: ruta explícita al archivo de configuración del cliente (obligatoria para `generic`)
- `--origin URL`: origen personalizado de Paymos (`https://...` o loopback `http://127.0.0.1` / `http://localhost`, predeterminado `https://app.paymos.io`)
- `--token-file PATH`: ruta personalizada para guardar los tokens OAuth
- `--no-login`: escribe la configuración del cliente sin ofrecer inicio de sesión OAuth en el navegador
- `--sandbox`: activa la configuración del Sandbox local basado en claves (`credentials.json`); no puede combinarse con `--origin`, `--token-file` ni `--no-login`
- `--credentials-file PATH`: archivo independiente para las credenciales de prueba de Sandbox (implica `--sandbox`)
- `--dry-run`: previsualiza los archivos de destino sin iniciar sesión ni escribir cambios
- `--help`, `-h`: muestra la ayuda del comando

También puedes ejecutar `npx -y @paymos/mcp auth` directamente para iniciar sesión de inmediato vía OAuth en el navegador y configurar clientes (admite `--client`, `--config`, `--origin`, `--token-file`, `--no-login` y `--dry-run`).

### Puente OAuth local (`connect`)

Los clientes configurados inician `npx -y @paymos/mcp connect` (o `cmd /d /c npx -y @paymos/mcp connect` en Windows). `connect`:

- Envía `instructions` en `initialize`, sirve localmente las `30` páginas compiladas `paymos://docs/*` ante `resources/list` y `resources/read`, y expone `191` herramientas (`3` herramientas locales sin conexión + `188` herramientas de cuenta comercial y Sandbox) en `tools/list` sin bloquear el arranque del IDE.
- Ejecuta `paymos_auth_status`, `recommend_payment_integration` y `verify_webhook_signature` 100 % en local, sin solicitudes de red ni ventanas emergentes del navegador.
- Activa OAuth PKCE `S256` en el navegador de forma diferida solo al invocar una herramienta de API de cuenta o Sandbox (`get_connection_status`, `merchant_*`, `playground_*`) sin una sesión válida, y renueva de manera transparente los tokens de acceso caducados.

### Conectores de URL directa (clientes OAuth en la nube o nativos)

Los clientes que se conectan directamente mediante Streamable HTTP OAuth 2.1 + DCR pueden usar:

- URL: `https://app.paymos.io/connect/merchant-mcp`
- Alcances OAuth: `merchant:mcp` y `offline_access`

### Entrega segura de claves y archivos

Las herramientas comerciales pueden crear y rotar credenciales de cobro (*Payment*) y desembolso (*Payout*) bajo la política de acceso del comercio. Las herramientas devuelven un ticket de instalación de corta duración. El instalador usa un verificador generado en la máquina de destino para canjear el ticket y guardar las credenciales en el archivo de entorno elegido.

```bash
paymos install-secret --prepare --file .env --merchant-id "$PAYMOS_MERCHANT_ID" --environment production --operation-id "$PAYMOS_OPERATION_ID"
paymos install-secret --file .env --request-id "$PAYMOS_REQUEST_ID" --token "$PAYMOS_INSTALLER_TICKET"
```

Pasa el `request_id` y el `challenge` del primer comando en la entrada `delivery` de la herramienta con el mismo ID de comercio, entorno y `operation_id`. Ejecuta el segundo comando en la misma máquina con el ticket devuelto. Para exportaciones privadas y cargas preparadas de logotipos o avatares, los asistentes `download-file` y `upload-file` siguen el mismo flujo de preparación y canje con `--file`. La preparación de cargas también proporciona el tamaño del archivo, el tipo de contenido y el hash.

Los retiros siguen la política vigente del comercio y las reglas nativas de aprobación. Administra las direcciones de la lista blanca de retiros desde el panel de control.

## Sandbox local (`--sandbox`)

Si prefieres un servidor stdio local basado en claves exclusivamente para llamadas a la API de Sandbox, pasa `--sandbox` (o `--credentials-file` / variables de entorno `PAYMOS_API_*`). Proporciona `15` herramientas (`recommend_payment_integration`, `verify_webhook_signature` y `13` herramientas Sandbox de facturas y canales de pago) más `5` recursos de documentación, firmando las solicitudes de la API con un par de claves Payment de prueba (`pk_test_…` y `sk_test_…`) a través de `@paymos/sdk`.

### Requisitos

- Node.js 22.12 o superior
- Una cuenta comercial de Paymos con un par de claves de prueba desde **Dashboard → Developer → API Keys** (`pk_test_…` y `sk_test_…`)
- Un cliente MCP capaz de iniciar un servidor stdio local

### Configurar el servidor Sandbox local

Ejecuta:

```bash
npx -y @paymos/mcp setup --sandbox
```

O especifica el cliente directamente:

```bash
npx -y @paymos/mcp setup --sandbox --client codex
```

Elige tu cliente e introduce tu par de claves de prueba (la entrada secreta permanece oculta). También puedes indicar un secreto de webhook para verificar firmas o pulsar Intro para omitirlo. Si los valores ya están en tu entorno, `setup` lee `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET` y el opcional `PAYMOS_WEBHOOK_SECRET`.

`setup` guarda las credenciales por separado, de forma predeterminada en `$XDG_CONFIG_HOME/paymos/mcp/credentials.json` o `~/.config/paymos/mcp/credentials.json` cuando `XDG_CONFIG_HOME` no está definida. Usa `--credentials-file PATH` para elegir otra ubicación fuera de tu proyecto. La entrada del cliente solo contiene `PAYMOS_CREDENTIALS_FILE` con esa ruta; nunca contiene tus claves. Mantén el archivo de credenciales fuera del control de versiones.

Para previsualizar los cambios propuestos del Sandbox, ejecuta:

```bash
npx -y @paymos/mcp setup --sandbox --client codex --dry-run
```

`--dry-run` no escribe archivos ni imprime secretos. Repetir `setup` con los mismos datos no añade una entrada duplicada. Si la configuración o las credenciales existentes de Paymos difieren, `setup` rechaza sobrescribirlas para que puedas revisar el conflicto. El resto de servidores, comentarios, modelos y ajustes del cliente se conservan intactos. Una entrada antigua de Paymos con variables de entorno de claves en línea también provoca un conflicto; `setup` no la migra automáticamente.

Reinicia o reconecta tu cliente MCP tras la configuración y busca Paymos en su lista de servidores. Usa `npx -y @paymos/mcp setup --help` para ver la lista completa de opciones. Sin una terminal interactiva, `--sandbox` exige `--client` y las variables de entorno obligatorias de claves (`PAYMOS_API_KEY_ID` y `PAYMOS_API_SECRET`).

## Configuración manual

Para el modo de puente OAuth sin claves (`connect`), configura tu cliente para ejecutar `npx -y @paymos/mcp connect` (no se necesita `PAYMOS_CREDENTIALS_FILE`). Para el Sandbox local con claves (`--sandbox`), crea primero un archivo de credenciales fuera del proyecto:

```json
{
  "apiKeyId": "pk_test_…",
  "apiSecret": "sk_test_…",
  "webhookSecret": "whsec_…"
}
```

`webhookSecret` es opcional. En Unix, ejecuta `chmod 600 /absolute/path/credentials.json` tras guardar, usando la ruta absoluta real. En Windows, conserva el archivo dentro del directorio de tu cuenta y verifica sus permisos de acceso. En los ejemplos siguientes, reemplaza `/absolute/path/credentials.json` por la ruta absoluta del archivo (u omite `env` y añade `"connect"` a `args` para el modo de puente OAuth), conservando los demás ajustes del cliente.

### Claude Code, Claude Desktop, Kimi CLI, Cursor, Windsurf y clientes genéricos

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

Para el modo `--sandbox` con archivo de credenciales, usa `"args": ["-y", "@paymos/mcp"]` y `"env": { "PAYMOS_CREDENTIALS_FILE": "/absolute/path/credentials.json" }`.

Consulta las rutas en la tabla de configuración. Claude Code también acepta un archivo `.mcp.json` en el proyecto. Claude Desktop usa `~/Library/Application Support/Claude/claude_desktop_config.json` en macOS y `%APPDATA%\Claude\claude_desktop_config.json` en Windows. Cline y Roo Code muestran su configuración en **MCP Servers → Configure**.

### Codex

Añade a `config.toml`:

```toml
[mcp_servers.paymos]
command = "npx"
args = ["-y", "@paymos/mcp", "connect"]
```

Para el modo `--sandbox`:

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

Añade a `.vscode/mcp.json` o a tu configuración MCP de usuario:

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

Zed requiere configuración manual; `setup` no dispone de adaptador para Zed. En Unix, usa `~/.config/zed/settings.json` para la configuración global o `.zed/settings.json` para un proyecto. En Windows, abre la configuración en Zed para localizar el archivo `settings.json` activo y añade:

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

En cada ejemplo manual, utiliza este lanzador en Windows:

```json
"command": "cmd",
"args": ["/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]
```

OpenCode usa un único array: `"command": ["cmd", "/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]`. Para el archivo TOML de Codex, establece `command = "cmd"` y el mismo array de argumentos. `setup` selecciona el lanzador de Windows automáticamente.

### Opciones de credenciales existentes

En el modo `--sandbox`, el servidor sigue leyendo directamente `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET` y el opcional `PAYMOS_WEBHOOK_SECRET`. Las banderas `--api-key-id` y `--api-secret` también siguen disponibles. Las variables de entorno tienen prioridad sobre las banderas, y estas sobre los campos del archivo de credenciales. Evita dejar secretos en el historial de comandos o en archivos bajo control de versiones.

## Herramientas

### Herramientas locales sin conexión en `connect` (`3` sin conexión + `188` herramientas comerciales = `191` en total)

| Herramienta | Propósito |
|---|---|
| `paymos_auth_status` | Lee el estado local de inicio de sesión OAuth en Paymos (`active`, `refreshable`, `none`) y el origen activo sin llamadas de red ni apertura del navegador |
| `recommend_payment_integration` | Asesor de integración sin conexión que cubre `cms_plugin` (15 complementos oficiales de CMS), `checkout_widget`, `pos_terminal`, `order_checkout`, `repeat_deposits`, `both` y `unsure`, además de SDKs, redes/activos admitidos y reglas de webhooks |
| `verify_webhook_signature` | Verifica `X-Webhook-Signature` localmente frente al cuerpo sin procesar del webhook usando `@paymos/sdk` (admite rotación con doble `v1=`; utiliza `secret` o `PAYMOS_WEBHOOK_SECRET`) |

Una vez iniciada la sesión (o en la primera llamada mediante OAuth diferido), `connect` también expone `188` herramientas de cuenta comercial y Sandbox (`get_connection_status`, `merchant_*`, `playground_*`).

### Herramientas del Sandbox local (`--sandbox`, `15` en total)

| Herramienta | Propósito |
|---|---|
| `recommend_payment_integration` | Recomienda facturas, canales de pago o ambos según el flujo de cobro del comercio. Explica el encaje y el ciclo de vida relevante. Si falta información, devuelve una pregunta concreta en lugar de decidir por su cuenta. Respeta cualquier elección explícita del comercio. |
| `create_invoice` | Crea una factura de sandbox; idempotente por `external_order_id`; devuelve `payment_url` |
| `get_invoice` | Obtiene el estado actual de una factura |
| `list_invoices` | Obtiene una página por cursor de facturas con filtros |
| `cancel_invoice` | Cancela una factura impaga y guarda el motivo |
| `simulate_invoice_payment` | Simula `paid`, `paid_late`, `overpaid`, `underpay` o `cancel` en sandbox |
| `verify_webhook_signature` | Verifica `X-Webhook-Signature` localmente contra el cuerpo sin procesar del webhook |
| `create_payment_channel` | Crea un canal de pago; idempotente por `project_id` y `external_id` |
| `get_payment_channel` | Lee el estado actual del canal y sus direcciones de depósito disponibles |
| `list_payment_channels` | Lista una página de canales con filtros y cursor |
| `block_payment_channel` | Cambia el estado de un canal de pago a bloqueado |
| `unblock_payment_channel` | Retira el estado de bloqueo de un canal de pago |
| `simulate_payment_channel_deposit` | Simula un nuevo depósito `confirming`, `reorged` o `confirmed` |
| `get_payment_channel_deposit` | Lee un depósito en cualquier etapa |
| `list_payment_channel_deposits` | Lee una página de depósitos confirmados, del más antiguo al más reciente |

Cada llamada a `simulate_payment_channel_deposit` crea un nuevo depósito de prueba. El feed de depósitos solo devuelve depósitos confirmados. Guarda `next_cursor` de cada respuesta, incluidas las páginas vacías, y úsalo en el siguiente sondeo. Si el feed deja de avanzar, revisa `blocked` para conocer el depósito bloqueante y el motivo.

Un cursor del feed de depósitos tiene validez de 24 horas; mantén `confirmed_from` sin cambios al continuar con ese cursor.

`paid_late` es un escenario de simulación, no un estado de factura. Consulta la [documentación del sandbox](https://paymos.io/es/docs/testing) para conocer su comportamiento.

Los errores de las herramientas usan `{ "code": "paymos/<api_error_code>", "message": "…" }`. Los rechazos de sandbox y credenciales usan `paymos/sandbox-only`, `paymos/missing-credentials` y `paymos/invalid-credentials`.

## Recursos

En modo `connect`, se compilan en tiempo de compilación `30` páginas de documentación (`CONNECT_DOC_RESOURCES`) que se sirven localmente mediante `resources/list` y `resources/read` sin acceso a red ni OAuth:

- Núcleo y checkout: `paymos://docs/overview`, `paymos://docs/quick-start`, `paymos://docs/payment-flow`, `paymos://docs/hosted-checkout`, `paymos://docs/supported-currencies`, `paymos://docs/widget-sdk`, `paymos://docs/widget-terminal`, `paymos://docs/server-sdks`, `paymos://docs/api-keys`, `paymos://docs/webhooks`, `paymos://docs/webhooks-verify`, `paymos://docs/testing-sandbox`, `paymos://docs/payment-channels-create`, `paymos://docs/payment-channel-deposits-list`, `paymos://docs/errors`
- Complementos oficiales de CMS (`15`): `paymos://docs/cms-woocommerce`, `paymos://docs/cms-whmcs`, `paymos://docs/cms-prestashop`, `paymos://docs/cms-magento2`, `paymos://docs/cms-opencart`, `paymos://docs/cms-shopware6`, `paymos://docs/cms-cscart`, `paymos://docs/cms-easy-digital-downloads`, `paymos://docs/cms-drupal-commerce`, `paymos://docs/cms-hikashop`, `paymos://docs/cms-givewp`, `paymos://docs/cms-odoo`, `paymos://docs/cms-blesta`, `paymos://docs/cms-fossbilling`, `paymos://docs/cms-paymenter`

En modo `--sandbox`, cinco páginas de documentación (`DOC_RESOURCES`) siguen disponibles dentro de la sesión MCP:

- `paymos://docs/quick-start`
- `paymos://docs/hosted-checkout`
- `paymos://docs/webhooks`
- `paymos://docs/testing-sandbox`
- `paymos://docs/server-sdks`

## Sandbox y credenciales

El servidor no abre ningún puerto de escucha en red (salvo el callback temporal en loopback durante el inicio de sesión OAuth en navegador) y llama a la Merchant API mediante `@paymos/sdk` en modo `--sandbox`. La salida de `setup` nunca imprime valores secretos. Revisa por separado los ajustes de registro de tu cliente y del proveedor del modelo. `setup` almacena los tokens OAuth y las claves Sandbox en archivos locales independientes; en Unix, los nuevos archivos de credenciales y tokens usan permisos `0600` dentro de un directorio privado. En Windows, el acceso hereda los permisos del directorio de tu cuenta; `setup` no cifra el archivo.

En modo `--sandbox`, las claves de producción (`pk_live_`/`sk_live_`) y las claves de desembolso (`rk_…`) se rechazan durante `setup`, al arrancar el servidor y en cada invocación de herramienta. Tras validar tu integración en el sandbox, ejecuta tu propia aplicación con sus claves de producción. El servidor `--sandbox` permanece aislado de las rutas de pago reales.

## Preguntas frecuentes

### ¿Cómo funciona Paymos MCP sin exponer claves de API al LLM?
Los complementos nativos de IA (Claude Code, OpenAI Codex, Cursor, Antigravity, Gemini CLI, GitHub Copilot CLI) se conectan por Streamable HTTP remoto a `https://app.paymos.io/connect/merchant-mcp` mediante OAuth 2.1 PKCE: ninguna clave de API en claro se guarda en prompts ni en configuraciones del IDE. En el modo CLI local (`npx -y @paymos/mcp setup`), los tokens OAuth se almacenan en directorios de usuario protegidos por el sistema operativo fuera del proyecto, e `install-secret` escribe las claves del comercio directamente en `.env` sin mostrarlas en el contexto del LLM.

### ¿Qué criptomonedas y redes admite Paymos?
Paymos admite **5 activos** —cuatro stablecoins (**USDT, USDC, USD1, DAI**) y un activo respaldado por oro (**XAUT**)— en **13 redes mainnet** para pagos entrantes (`TRC20, ERC20, BEP20, POLYGON, ARBITRUM, OPTIMISM, BASE, TON, AVAX, SOL, NEAR, SUI, PLASMA`) y **11 redes** para retiros (`NEAR` y `Sui` son solo de depósito). La liquidación se mantiene en el activo aceptado con una tarifa estándar de **1.0%** en cobros entrantes y **0%** de comisión de Paymos en retiros (solo tarifas de red).

### ¿Puede un agente de IA mover fondos reales o saltarse las listas blancas de retiro?
No. Merchant MCP aplica exactamente el rol de Paymos del usuario autenticado (`Owner`, `Admin`, `Finance`, `Developer`, `Custom`). Las acciones sensibles en Producción devuelven `user_action_required` con una `continue_url` del panel para confirmación humana explícita, y la lista blanca de direcciones de retiro está activada de forma predeterminada y se gestiona solo desde el panel.

### ¿Cuál es la diferencia entre las 188 herramientas remotas y las 191 herramientas CLI?
Las conexiones HTTP remotas directas (`https://app.paymos.io/connect/merchant-mcp`) exponen **188** herramientas de espacio de trabajo y Sandbox en el servidor (`162` `merchant_*`, `25` `playground_*` y `get_connection_status`). Ejecutar el envoltorio stdio local `@paymos/mcp connect` suma **3** utilidades locales sin red (`paymos_auth_status`, `recommend_payment_integration`, `verify_webhook_signature`) más `30` páginas compiladas `paymos://docs/*`, alcanzando **191** herramientas en total.

Documentación completa: [Guía de Paymos MCP y Agentes de IA](https://paymos.io/es/docs/mcp) · [Página de producto AI Agents](https://paymos.io/es/product/ai-agents)

## Desarrollo

```bash
npm install                 # @paymos/sdk resolves from ../typescript-sdk
npm run build:resources     # regenerate documentation resources
npm test                    # package tests
npm run build               # bundle to dist/
```

Licencia: MIT — consulta [LICENSE](../LICENSE).
