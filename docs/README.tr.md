# @paymos/mcp — Resmi Paymos MCP Sunucusu ve Yapay Zeka Eklentisi

[English](../README.md) | [简体中文](README.zh-CN.md) | [Русский](README.ru.md) | [Español](README.es.md) | [Deutsch](README.de.md) | **Türkçe**

[![Paymos MCP server](https://glama.ai/mcp/servers/Paymos-labs/mcp/badge)](https://glama.ai/mcp/servers/Paymos-labs/mcp)

Resmi Paymos MCP sunucusu ve çoklu yapay zeka eklenti paketi: Paymos'u `Paymos-labs/mcp` üzerinden uzak Streamable HTTP OAuth 2.1 ile Claude Code, OpenAI Codex, Antigravity, Gemini CLI, GitHub Copilot CLI, Cursor veya herhangi bir Agent Skills istemcisine doğrudan kurun (`188` satıcı çalışma alanı ve Sandbox aracı, yerel Node.js gerekmez) — ya da çevrimdışı dokümantasyon, entegrasyon danışmanı, `.env`/dosya yardımcıları (`connect` modunda toplam `191` araç) veya anahtar tabanlı Yerel Sandbox (`--sandbox`) için yerel `@paymos/mcp` CLI/stdio köprüsünü çalıştırın.

[![İzle: 10 Dakikada Paymos API Hızlı Başlangıç — Sandbox'tan İmzalı Webhook'lara](https://i.ytimg.com/vi/aHQfHszuRBo/maxresdefault.jpg)](https://www.youtube.com/watch?v=aHQfHszuRBo)

> **Video anlatım (1:22, 6 dilde altyazılı):** [YouTube'da izle](https://www.youtube.com/watch?v=aHQfHszuRBo)

## Yapay zeka eklentisi olarak kurulum (önerilen — Node.js gerekmez)

Yerleşik eklentiler otomatik OAuth 2.1 PKCE + Dinamik İstemci Kaydı ile doğrudan `https://app.paymos.io/connect/merchant-mcp` adresine bağlanır (`188` çalışma alanı ve Sandbox aracı) ve 4 platformlar arası Paymos Agent Skills becerisi ile güvenlik kurallarını birlikte sunar:

| İstemci | Kurulum komutu | Notlar |
|---|---|---|
| **Claude Code** | `claude plugin marketplace add Paymos-labs/mcp && claude plugin install paymos@paymos` | Etkileşimli oturumlarda `/plugin marketplace add Paymos-labs/mcp` ve `/plugin install paymos@paymos` komutları da çalışır. |
| **OpenAI Codex** | `codex plugin marketplace add Paymos-labs/mcp` | GitHub üzerinden marketplace kaynağını kaydeder; ardından `/plugins` bölümünden **Paymos**'u seçin. |
| **Antigravity** | `agy plugin install https://github.com/Paymos-labs/mcp.git` | `plugin.json`, `mcp_config.json`, `rules/AGENTS.md` ve `skills/` yapılarını otomatik algılar. |
| **Gemini CLI** | `gemini extensions install https://github.com/Paymos-labs/mcp` | `gemini-extension.json` (`httpUrl` + `oauth.enabled`) ve `rules/AGENTS.md` dosyalarını kullanır. |
| **GitHub Copilot CLI** | `copilot plugin marketplace add Paymos-labs/mcp && copilot plugin install paymos@paymos` | `.github/plugin/marketplace.json` manifestini kaydeder ve `paymos@paymos` eklentisini kurar. |
| **Agent Skills (30+ yapay zeka aracı)** | `npx skills add Paymos-labs/mcp` | Tüm 4 Paymos becerisini Cursor, Windsurf, OpenCode, Cline, Roo Code, Zed ve diğer Agent Skills istemcilerine kurar; MCP araçları için `npx -y @paymos/mcp setup` ile birlikte kullanın. |
| **Cursor** | `.cursor-plugin/plugin.json` + `mcp.json` + `rules/paymos.mdc` + `skills/` veya `npx -y @paymos/mcp setup --client cursor` + `npx skills add Paymos-labs/mcp` | Yerleşik Cursor eklenti manifestleri, CLI kurulumu ve Agent Skills desteğiyle birlikte depo kökünde yer alır. |

### Dahil edilen Paymos Agent Skills becerileri (`skills/`)

| Beceri | Kapsam |
|---|---|
| `paymos-integrate` | Paymos entegrasyon seçimi ve kurulumu (15 resmi CMS eklentisi, açık `PaymosWidget.mount()` çağrılı düşük kodlu JS widget'ı `/v1/paymos-widget.js`, tarayıcı POS terminali, Hosted Checkout, Host-to-Host `confirm-payment`, Telegram Bot ödeme akışı, Ödeme Kanalları, 8 sunucu SDK'sı), kesin varlık/ağ kuralları (4 sabit coin `USDT`/`USDC`/`USD1`/`DAI` + altın destekli `XAUT`, 13 yatırma / 11 çekim ağı, 45 itibari para birimi) ve `install-secret` ile gizli anahtar sızdırmadan `.env` yazımı. |
| `paymos-webhooks` | Ham gövde üzerinde `X-Webhook-Signature` HMAC-SHA256 doğrulaması (24 saatlik çift `v1=` anahtar rotasyon penceresi, `300` sn tolerans), `event_id` üzerinden tekilleştirme (asla `X-Webhook-Id` değil), 18 olayın tamamı (yalnızca bilgilendirme amaçlı `invoice.paid_late` dahil 9 fatura olayı, 3 ödeme kanalı olayı, 6 çekim olayı), `GET /v1/invoices/{id}` ile ters doğrulama ve `confirmed` + `is_final: true` kesinleşme kuralı. |
| `paymos-sandbox` | MCP üzerinden uçtan uca Sandbox simülasyonu (`paid`, `overpaid`, `underpay`, `cancel`, `paid_late`; `confirming`, `reorged`, `confirmed` kanal yatırımları; iadeler ve çekimler) ile sıkı Sandbox/Üretim izolasyonu. |
| `paymos-workspace` | Merchant MCP ile Paymos satıcı çalışma alanını yönetme: rol temelleri (`Owner`/`Admin`/`Finance`/`Developer`/`Custom`), `user_action_required` yanıtında `continue_url` bağlantısının birebir aktarılması ve `operation_id` ile yeniden deneme, `otk_*`/`ftk_*` yerel yardımcıları ve yalnızca yönetim panelinden yönetilen çekim beyaz listesi kuralları. |

> Çevrimdışı `paymos://docs/*` sayfalarına (`30` derlenmiş doküman), oturum açmadan önce çalışan çevrimdışı danışman/webhook doğrulama araçlarına, yerel `.env`/dosya yardımcılarına (`install-secret`, `download-file`, `upload-file`) veya anahtar tabanlı Yerel Sandbox'a (`--sandbox`) mı ihtiyacınız var? Aşağıdaki `@paymos/mcp` CLI kurulumunu kullanın (Node.js 22.12+ gerektirir).

## Hızlı kurulum (CLI köprüsü ve çevrimdışı dokümanlar)

Desteklenen herhangi bir yapay zeka IDE'sini veya CLI istemcisini API anahtarı olmadan tek komutla yapılandırın:

```bash
npx -y @paymos/mcp setup
```

`setup` **Node.js 22.12 veya daha yeni** bir sürüm gerektirir ve anahtarsız kurulum öncelikli bir akış izler:

1. Yüklü MCP istemcilerini otomatik algılar (`antigravity`, `claude-code`, `codex`, `kimi`, `zcode`/`glm`, `cursor`, `windsurf`, `opencode`, `claude-desktop` ve proje içi `.vscode`); hiçbiri bulunamazsa etkileşimli terminalde seçim ister (etkileşimsiz terminallerde varsayılan olarak `claude-code` ve `codex` seçilir).
2. Önce diğer sunucuları ve yorum satırlarını koruyarak yerel stdio köprüsü (`@paymos/mcp connect`) yapılandırmasını yazar. Yerel Sandbox kaydı `paymos` adını zaten kullanıyorsa Merchant MCP yanına `paymos-merchant` adıyla eklenir.
3. İsteğe bağlı olarak tarayıcı üzerinden OAuth 2.1 PKCE `S256` oturumu açmayı teklif eder (`[Y/n]`, `merchant:mcp` ve `offline_access` kapsamları).
   - **Reddet (`n`), `--no-login` ver veya etkileşimsiz çalıştır:** `setup` `0` çıkış koduyla sonlanır ve Paymos'u **çevrimdışı referans ve entegrasyon danışmanı modunda** hazır bırakır (`30` derlenmiş `paymos://docs/*` kaynağı + `paymos_auth_status`, `recommend_payment_integration` ve `verify_webhook_signature`; ağ çağrısı veya tarayıcı penceresi açılmaz).
   - **Kabul et (`Y` / Enter):** erişimi onaylamak için tarayıcınızı açar ve OAuth belirteçlerini IDE yapılandırmalarının dışında işletim sistemi korumalı izinlerle saklar (Windows'ta `%APPDATA%\Paymos\mcp\merchant-oauth.json`, Unix'te `$XDG_CONFIG_HOME/paymos/mcp/merchant-oauth.json`). Tarayıcı oturumu iptal edilse veya başarısız olsa bile IDE yapılandırmanız çevrimdışı referans modu için kayıtlı kalır.

**Dashboard → Developers → Agents** sayfası etkin bağlantıları, etkinlik geçmişini, son işlemleri ve bağlantıyı kesme (**Disconnect**) seçeneğini gösterir.

### Desteklenen istemciler ve örnekler

```bash
npx -y @paymos/mcp setup
npx -y @paymos/mcp setup --client antigravity
npx -y @paymos/mcp setup --client glm
npx -y @paymos/mcp setup --client codex
npx -y @paymos/mcp setup --client claude-code
npx -y @paymos/mcp setup --client antigravity --no-login
```

| İstemci | `--client` değeri | Varsayılan yapılandırma |
|---|---|---|
| Codex | `codex` | `$CODEX_HOME/config.toml` veya `~/.codex/config.toml` |
| Claude Code | `claude-code` | `~/.claude.json` |
| Claude Desktop | `claude-desktop` | Claude'un macOS veya Windows yapılandırması |
| Antigravity | `antigravity` | `~/.gemini/config/mcp_config.json` |
| Kimi CLI | `kimi` | `$KIMI_CODE_HOME/mcp.json` veya `~/.kimi-code/mcp.json` |
| ZCode / GLM | `zcode` (takma ad `glm`) | `~/.zcode/cli/config.json` |
| Cursor | `cursor` | `~/.cursor/mcp.json` |
| Windsurf | `windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| OpenCode | `opencode` | `OPENCODE_CONFIG` veya `$XDG_CONFIG_HOME/opencode` / `~/.config/opencode` altındaki kullanıcı yapılandırması |
| VS Code | `vscode` | Geçerli dizindeki `.vscode/mcp.json` |
| Diğer istemci | `generic` | Açık `--config PATH` gereklidir |

OpenCode için `setup`, mevcut bir `opencode.jsonc` dosyasını `opencode.json` dosyasına tercih eder. Herhangi bir istemcide farklı bir yapılandırma dosyası kullanmak için `--config PATH` parametresini verin. Diğer işletim sistemlerindeki Claude Desktop kurulumları için açık dosya yolu gerekir. Cline, Roo Code ve özel istemciler, ilgili istemcinin gösterdiği MCP yapılandırma yoluyla `--client generic --config PATH` seçeneğini kullanabilir.

Dosyaları değiştirmeden veya oturum açmadan önerilen değişiklikleri önizlemek için:

```bash
npx -y @paymos/mcp setup --client codex --dry-run
```

Kimi CLI bir istemcidir, Kimi modelinin kendisinden farklıdır. Hem istemci hem de seçilen model araç çağırmayı (*tool calling*) desteklediği sürece GLM, Kimi ve özel modeller MCP istemcisi aracılığıyla Paymos kullanabilir. `setup` modelinizi değiştirmez. Örneğin [Z.ai, GLM'nin Claude Code içinde nasıl çalıştırılacağını açıklar](https://docs.z.ai/devpack/tool/claude); modeli yapılandırdıktan sonra Claude Code bağdaştırıcısıyla Paymos'u ekleyin.

### `setup` seçenekleri

- `--client NAME`: `codex`, `claude-code`, `claude-desktop`, `antigravity`, `kimi`, `zcode` (veya takma ad `glm`), `cursor`, `windsurf`, `opencode`, `vscode` ya da `generic`
- `--config PATH`: açık istemci yapılandırma yolu (`generic` için zorunlu)
- `--origin URL`: özel Paymos kaynağı (`https://...` veya yerel geri döngü `http://127.0.0.1` / `http://localhost`, varsayılan `https://app.paymos.io`)
- `--token-file PATH`: özel OAuth belirteç depolama yolu
- `--no-login`: tarayıcı OAuth oturumu önermeden istemci yapılandırmalarını yazar
- `--sandbox`: anahtar tabanlı Yerel Sandbox kurulumunu (`credentials.json`) etkinleştirir; `--origin`, `--token-file` veya `--no-login` ile birlikte kullanılamaz
- `--credentials-file PATH`: Sandbox test kimlik bilgileri için ayrı dosya (`--sandbox` seçeneğini otomatik etkinleştirir)
- `--dry-run`: oturum açmadan veya yazmadan hedef dosyaları önizler
- `--help`, `-h`: komut kullanımını gösterir

Ayrıca doğrudan `npx -y @paymos/mcp auth` çalıştırarak tarayıcı OAuth ile hemen oturum açabilir ve istemcileri yapılandırabilirsiniz (`--client`, `--config`, `--origin`, `--token-file`, `--no-login` ve `--dry-run` seçeneklerini destekler).

### Yerel OAuth köprüsü (`connect`)

Yapılandırılan istemciler `npx -y @paymos/mcp connect` komutunu başlatır (Windows'ta `cmd /d /c npx -y @paymos/mcp connect`). `connect`:

- `initialize` aşamasında `instructions` gönderir, `resources/list` ve `resources/read` çağrılarında `30` derlenmiş `paymos://docs/*` sayfasının tamamını yerelden sunar ve `tools/list` üzerinde `191` aracı (`3` yerel çevrimdışı araç + `188` satıcı hesabı ve Sandbox aracı) IDE başlangıcını bloke etmeden yayınlar.
- `paymos_auth_status`, `recommend_payment_integration` ve `verify_webhook_signature` araçlarını ağ çağrısı veya tarayıcı penceresi olmadan %100 yerelde çalıştırır.
- Geçerli bir oturum yokken bir hesap veya Sandbox API aracı (`get_connection_status`, `merchant_*`, `playground_*`) çağrıldığında tarayıcı OAuth PKCE `S256` akışını yalnızca ihtiyaç anında tetikler ve süresi dolmuş erişim belirteçlerini şeffaf biçimde yeniler.

### Doğrudan URL bağlayıcıları (bulut / yerleşik OAuth istemcileri)

Streamable HTTP OAuth 2.1 + DCR üzerinden doğrudan bağlanan istemciler şunları kullanabilir:

- URL: `https://app.paymos.io/connect/merchant-mcp`
- OAuth kapsamları: `merchant:mcp` ve `offline_access`

### Anahtar ve dosya teslimi

Satıcı araçları, satıcının erişim politikası kapsamında Ödeme (*Payment*) ve Çekim/Ödeme Çıkışı (*Payout*) kimlik bilgileri oluşturabilir ve döndürebilir. Araçlar kısa ömürlü bir kurulum bileti (*installer ticket*) döndürür. Kurulum yardımcısı hedef makinede oluşturulan bir doğrulayıcı (*verifier*) ile bu bileti takas eder ve kimlik bilgilerini seçilen ortam dosyasına kaydeder.

```bash
paymos install-secret --prepare --file .env --merchant-id "$PAYMOS_MERCHANT_ID" --environment production --operation-id "$PAYMOS_OPERATION_ID"
paymos install-secret --file .env --request-id "$PAYMOS_REQUEST_ID" --token "$PAYMOS_INSTALLER_TICKET"
```

İlk komutun ürettiği `request_id` ve `challenge` değerlerini aynı satıcı kimliği, ortam ve `operation_id` ile aracın `delivery` girdisine verin. Ardından dönen biletle ikinci komutu aynı makinede çalıştırın. Özel dışa aktarmalar ile hazırlanan logo veya avatar yüklemeleri için `download-file` ve `upload-file` yardımcıları `--file` ile aynı hazırlama ve takas akışını kullanır. Yükleme hazırlığı ayrıca dosya boyutunu, içerik türünü ve karmasını (*hash*) sağlar.

Çekimler satıcının mevcut politikasına ve yerleşik onay kurallarına tabidir. Çekim beyaz listesi adreslerini yönetim panelinden yönetin.

## Yerel Sandbox (`--sandbox`)

Yalnızca Sandbox API çağrıları için anahtar tabanlı bir yerel stdio sunucusu tercih ediyorsanız `--sandbox` (veya `--credentials-file` / `PAYMOS_API_*` ortam değişkenleri) kullanın. Bu mod `15` araç (`recommend_payment_integration`, `verify_webhook_signature` ve `13` Sandbox fatura/ödeme kanalı aracı) ile `5` dokümantasyon kaynağı sunar ve API isteklerini `@paymos/sdk` üzerinden test Ödeme anahtar çiftiyle (`pk_test_…` ve `sk_test_…`) imzalar.

### Gereksinimler

- Node.js 22.12 veya daha yeni sürüm
- **Dashboard → Developer → API Keys** bölümünden alınmış test anahtar çiftine (`pk_test_…` ve `sk_test_…`) sahip bir Paymos satıcı hesabı
- Yerel bir stdio sunucusu başlatabilen bir MCP istemcisi

### Yerel Sandbox sunucusunu kurma

Şunu çalıştırın:

```bash
npx -y @paymos/mcp setup --sandbox
```

Veya istemciyi doğrudan belirtin:

```bash
npx -y @paymos/mcp setup --sandbox --client codex
```

İstemcinizi seçin ve test anahtar çiftinizi girin (gizli anahtar girişi ekranda gizlenir). İsteğe bağlı olarak imza doğrulaması için bir webhook gizli anahtarı girebilir veya Enter'a basarak atlayabilirsiniz. Değerler ortamınızda zaten tanımlıysa `setup`, `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET` ve isteğe bağlı `PAYMOS_WEBHOOK_SECRET` değişkenlerini okur.

`setup`, kimlik bilgilerini ayrı bir dosyaya kaydeder; varsayılan konum `$XDG_CONFIG_HOME/paymos/mcp/credentials.json` veya `XDG_CONFIG_HOME` tanımlı değilse `~/.config/paymos/mcp/credentials.json` yoludur. Projenizin dışında başka bir konum seçmek için `--credentials-file PATH` kullanın. İstemci kaydı yalnızca bu yolu gösteren `PAYMOS_CREDENTIALS_FILE` değişkenini içerir; anahtarlarınızı içermez. Kimlik bilgisi dosyasını sürüm kontrolünün dışında tutun.

Önerilen Sandbox değişikliklerini önizlemek için şunu çalıştırın:

```bash
npx -y @paymos/mcp setup --sandbox --client codex --dry-run
```

`--dry-run` hiçbir dosya yazmaz ve gizli anahtar yazdırmaz. Aynı verilerle kurulumu tekrarlamak yinelenen kayıt eklemez. Mevcut Paymos ayarları veya kimlik bilgileri farklıysa `setup` çakışmayı inceleyebilmeniz için üzerine yazmayı reddeder. Diğer sunucular, yorumlar, modeller ve istemci ayarları korunur. Satır içi anahtar ortam değişkenleri içeren eski bir Paymos kaydı da çakışmaya yol açar; `setup` bunu otomatik olarak taşımaz.

Kurulumdan sonra MCP istemcinizi yeniden başlatın veya yeniden bağlayın ve sunucu listesinde Paymos'u kontrol edin. Tam seçenek listesi için `npx -y @paymos/mcp setup --help` komutunu kullanın. Etkileşimli terminal olmadan `--sandbox`, `--client` seçeneğini ve zorunlu anahtar ortam değişkenlerini (`PAYMOS_API_KEY_ID` ve `PAYMOS_API_SECRET`) gerektirir.

## Manuel yapılandırma

Anahtarsız OAuth köprü modu (`connect`) için istemcinizi `npx -y @paymos/mcp connect` çalıştıracak şekilde yapılandırın (`PAYMOS_CREDENTIALS_FILE` gerekmez). Anahtar tabanlı Yerel Sandbox (`--sandbox`) için önce proje dışında bir kimlik bilgisi dosyası oluşturun:

```json
{
  "apiKeyId": "pk_test_…",
  "apiSecret": "sk_test_…",
  "webhookSecret": "whsec_…"
}
```

`webhookSecret` isteğe bağlıdır. Unix sistemlerde dosyayı kaydettikten sonra gerçek mutlak yol ile `chmod 600 /absolute/path/credentials.json` çalıştırın. Windows'ta dosyayı kendi kullanıcı dizininizde saklayın ve mevcut erişim izinlerini kontrol edin. Aşağıdaki örneklerde `/absolute/path/credentials.json` yerine dosyanın gerçek mutlak yolunu yazın (veya OAuth köprü modu için `env` alanını kaldırıp `args` dizisine `"connect"` ekleyin) ve mevcut istemci ayarlarınızı koruyun.

### Claude Code, Claude Desktop, Kimi CLI, Cursor, Windsurf ve genel istemciler

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

Kimlik bilgisi dosyasıyla `--sandbox` modu için `"args": ["-y", "@paymos/mcp"]` ve `"env": { "PAYMOS_CREDENTIALS_FILE": "/absolute/path/credentials.json" }` değerlerini kullanın.

Kurulum tablosundaki dosya yollarını kullanın. Claude Code ayrıca proje içi `.mcp.json` dosyasını da kabul eder. Claude Desktop, macOS'ta `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows'ta `%APPDATA%\Claude\claude_desktop_config.json` dosyasını kullanır. Cline ve Roo Code yapılandırmalarını **MCP Servers → Configure** menüsünde gösterir.

### Codex

`config.toml` dosyasına ekleyin:

```toml
[mcp_servers.paymos]
command = "npx"
args = ["-y", "@paymos/mcp", "connect"]
```

`--sandbox` modu için:

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

`.vscode/mcp.json` dosyasına veya kullanıcı MCP yapılandırmanıza ekleyin:

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

Zed manuel yapılandırma gerektirir; `setup` komutunda Zed bağdaştırıcısı yoktur. Unix'te genel ayarlar için `~/.config/zed/settings.json` veya proje ayarları için `.zed/settings.json` kullanın. Windows'ta gerçek `settings.json` dosyasını bulmak için Zed içinden ayarları açın ve şunu ekleyin:

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

Her manuel örnek için Windows'ta şu başlatıcıyı kullanın:

```json
"command": "cmd",
"args": ["/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]
```

OpenCode tek bir dizi kullanır: `"command": ["cmd", "/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]`. Codex TOML için `command = "cmd"` ve aynı argüman dizisini ayarlayın. `setup` Windows başlatıcısını otomatik seçer.

### Mevcut kimlik bilgisi seçenekleri

`--sandbox` modunda sunucu `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET` ve isteğe bağlı `PAYMOS_WEBHOOK_SECRET` değişkenlerini doğrudan okumaya devam eder. `--api-key-id` ve `--api-secret` bayrakları da kullanılabilir. Ortam değişkenleri bayraklara, bayraklar ise kimlik bilgisi dosyasındaki alanlara göre önceliklidir. Gizli anahtarları komut geçmişine veya sürüm kontrolündeki yapılandırma dosyalarına yazmaktan kaçının.

## Araçlar

### `connect` içindeki yerel çevrimdışı araçlar (`3` çevrimdışı + `188` satıcı aracı = toplam `191`)

| Araç | Amaç |
|---|---|
| `paymos_auth_status` | Ağ çağrısı veya tarayıcı açmadan yerel Paymos OAuth oturum durumunu (`active`, `refreshable`, `none`) ve etkin kaynağı okur |
| `recommend_payment_integration` | `cms_plugin` (15 resmi CMS eklentisi), `checkout_widget`, `pos_terminal`, `order_checkout`, `repeat_deposits`, `both` ve `unsure` seçeneklerinin yanı sıra SDK'ları, desteklenen ağları/varlıkları ve webhook kurallarını kapsayan çevrimdışı entegrasyon danışmanı |
| `verify_webhook_signature` | `@paymos/sdk` kullanarak ham webhook gövdesine karşı `X-Webhook-Signature` başlığını yerelde doğrular (çift `v1=` anahtar rotasyonunu destekler; `secret` veya `PAYMOS_WEBHOOK_SECRET` kullanır) |

Oturum açıldığında (veya ilk çağrıda gecikmeli OAuth sonrası) `connect` ayrıca `188` satıcı hesabı ve Sandbox aracını (`get_connection_status`, `merchant_*`, `playground_*`) sunar.

### Yerel Sandbox (`--sandbox`) araçları (toplam `15`)

| Araç | Amaç |
|---|---|
| `recommend_payment_integration` | Satıcının ödeme akışına göre fatura, ödeme kanalı veya her ikisini birden önerir. Uyumluluğu ve ilgili yaşam döngüsünü açıklar. Bilgi eksikse tahmin etmek yerine hedefli bir soru sorar. Satıcının açık tercihini her zaman korur. |
| `create_invoice` | Sandbox faturası oluşturur; `external_order_id` bazında idempotenttir; `payment_url` döndürür |
| `get_invoice` | Faturanın güncel durumunu getirir |
| `list_invoices` | Filtrelerle birlikte tek bir imleç (*cursor*) sayfası fatura listeler |
| `cancel_invoice` | Ödenmemiş faturayı iptal eder ve gerekçeyi kaydeder |
| `simulate_invoice_payment` | Sandbox'ta `paid`, `paid_late`, `overpaid`, `underpay` veya `cancel` senaryosunu simüle eder |
| `verify_webhook_signature` | Ham webhook gövdesine karşı `X-Webhook-Signature` başlığını yerelde doğrular |
| `create_payment_channel` | Ödeme kanalı oluşturur; `project_id` ve `external_id` bazında idempotenttir |
| `get_payment_channel` | Kanalın güncel durumunu ve kullanılabilir yatırma adreslerini okur |
| `list_payment_channels` | Filtreler ve imleçle bir sayfa ödeme kanalı listeler |
| `block_payment_channel` | Ödeme kanalının durumunu engellenmiş (`blocked`) olarak ayarlar |
| `unblock_payment_channel` | Ödeme kanalının engel durumunu kaldırır |
| `simulate_payment_channel_deposit` | Yeni bir `confirming`, `reorged` veya `confirmed` yatırımı simüle eder |
| `get_payment_channel_deposit` | Herhangi bir aşamadaki yatırımı okur |
| `list_payment_channel_deposits` | Onaylanmış yatırımların bir sayfasını eskiden yeniye doğru okur |

Her `simulate_payment_channel_deposit` çağrısı yeni bir test yatırımı oluşturur. Yatırım akışı (*deposit feed*) yalnızca onaylanmış yatırımları döndürür. Boş sayfalar dahil her yanıttan `next_cursor` değerini kaydedin ve bir sonraki yoklamada kullanın. Akış ilerlemeyi durdurursa ilgili yatırım ve neden için `blocked` alanını kontrol edin.

Yatırım akışı imleci 24 saat geçerlidir; bu imleçle devam ederken `confirmed_from` değerini değiştirmeyin.

`paid_late` bir fatura durumu değil, bir simülasyon senaryosudur. Davranışı için [sandbox dokümantasyonuna](https://paymos.io/tr/docs/testing) bakın.

Araç hataları `{ "code": "paymos/<api_error_code>", "message": "…" }` biçimini kullanır. Sandbox ve kimlik bilgisi retleri `paymos/sandbox-only`, `paymos/missing-credentials` ve `paymos/invalid-credentials` kodlarını döndürür.

## Kaynaklar

`connect` modunda `30` dokümantasyon sayfası (`CONNECT_DOC_RESOURCES`) derleme zamanında paketlenir ve ağ erişimi veya OAuth olmadan `resources/list` ve `resources/read` üzerinden yerelden sunulur:

- Çekirdek ve ödeme akışı: `paymos://docs/overview`, `paymos://docs/quick-start`, `paymos://docs/payment-flow`, `paymos://docs/hosted-checkout`, `paymos://docs/supported-currencies`, `paymos://docs/widget-sdk`, `paymos://docs/widget-terminal`, `paymos://docs/server-sdks`, `paymos://docs/api-keys`, `paymos://docs/webhooks`, `paymos://docs/webhooks-verify`, `paymos://docs/testing-sandbox`, `paymos://docs/payment-channels-create`, `paymos://docs/payment-channel-deposits-list`, `paymos://docs/errors`
- Resmi CMS eklentileri (`15`): `paymos://docs/cms-woocommerce`, `paymos://docs/cms-whmcs`, `paymos://docs/cms-prestashop`, `paymos://docs/cms-magento2`, `paymos://docs/cms-opencart`, `paymos://docs/cms-shopware6`, `paymos://docs/cms-cscart`, `paymos://docs/cms-easy-digital-downloads`, `paymos://docs/cms-drupal-commerce`, `paymos://docs/cms-hikashop`, `paymos://docs/cms-givewp`, `paymos://docs/cms-odoo`, `paymos://docs/cms-blesta`, `paymos://docs/cms-fossbilling`, `paymos://docs/cms-paymenter`

`--sandbox` modunda MCP oturumu içinde beş dokümantasyon sayfası (`DOC_RESOURCES`) kullanılabilir:

- `paymos://docs/quick-start`
- `paymos://docs/hosted-checkout`
- `paymos://docs/webhooks`
- `paymos://docs/testing-sandbox`
- `paymos://docs/server-sdks`

## Sandbox ve kimlik bilgileri

Sunucu herhangi bir ağ dinleyicisi açmaz (tarayıcı OAuth sırasındaki geçici yerel geri döngü geri çağrısı hariç) ve `--sandbox` modunda Merchant API'yi `@paymos/sdk` üzerinden çağırır. `setup` çıktısı hiçbir gizli değeri ekrana yazdırmaz. Seçtiğiniz istemcinin ve model sağlayıcısının günlükleme (*logging*) ayarlarını ayrıca kontrol edin. `setup`, OAuth belirteçlerini ve Sandbox anahtarlarını ayrı yerel dosyalarda saklar; Unix'te yeni kimlik bilgisi ve belirteç dosyaları özel bir dizinde `0600` izinleriyle oluşturulur. Windows'ta erişim, kullanıcı dizininin izinlerini izler; dosya `setup` tarafından şifrelenmez.

`--sandbox` modunda canlı (`pk_live_`/`sk_live_`) ve ödeme çıkışı (`rk_…`) anahtarları kurulum sırasında, sunucu başlangıcında ve araç çağrılarında reddedilir. Entegrasyonunuzu sandbox'ta doğruladıktan sonra kendi uygulamanızı canlı anahtarlarıyla çalıştırın. `--sandbox` sunucusu üretim ödeme yollarının tamamen dışında kalır.

## Sıkça Sorulan Sorular

### Paymos MCP, API anahtarlarını LLM'ye ifşa etmeden nasıl çalışır?
Yerleşik yapay zeka eklentileri (Claude Code, OpenAI Codex, Cursor, Antigravity, Gemini CLI, GitHub Copilot CLI), OAuth 2.1 PKCE kullanarak uzak Streamable HTTP üzerinden `https://app.paymos.io/connect/merchant-mcp` adresine bağlanır — istemlerde veya IDE yapılandırma dosyalarında ham API anahtarı saklanmaz. Yerel CLI modunda (`npx -y @paymos/mcp setup`) OAuth belirteçleri çalışma alanı yapılandırmalarının dışındaki işletim sistemi korumalı kullanıcı dizinlerinde tutulur ve `install-secret` satıcı anahtarlarını LLM bağlamına yazdırmadan doğrudan `.env` dosyasına yazar.

### Paymos hangi kripto varlıkları ve ağları destekler?
Paymos, gelen ödemeler için **13 ana ağda** (`TRC20, ERC20, BEP20, POLYGON, ARBITRUM, OPTIMISM, BASE, TON, AVAX, SOL, NEAR, SUI, PLASMA`) ve çekimler için **11 ağda** (`NEAR` ve `Sui` yalnızca yatırma içindir) **5 varlığı** — dört sabit coin (**USDT, USDC, USD1, DAI**) ve bir altın destekli varlık (**XAUT**) — destekler. Takas kabul edilen varlık cinsinden kalır; standart gelen ödeme ücreti **%1,0**, Paymos çekim komisyonu **%0**'dır (yalnızca ağ ücretleri uygulanır).

### Bir yapay zeka ajanı gerçek fonları transfer edebilir veya çekim beyaz listelerini aşabilir mi?
Hayır. Merchant MCP, kimliği doğrulanmış kullanıcının tam Paymos rolünü (`Owner`, `Admin`, `Finance`, `Developer`, `Custom`) uygular. Hassas Üretim işlemleri, açık insan onayı için yönetim paneline yönlendiren bir `continue_url` ile `user_action_required` döndürür ve çekim adresi beyaz listesi varsayılan olarak etkindir ve yalnızca panelden yönetilir.

### 188 uzak araç ile 191 CLI aracı arasındaki fark nedir?
Doğrudan uzak HTTP bağlantıları (`https://app.paymos.io/connect/merchant-mcp`) sunucuda **188** çalışma alanı ve Sandbox aracı (`162` `merchant_*`, `25` `playground_*` ve `get_connection_status`) sunar. Yerel `@paymos/mcp connect` stdio sarmalayıcısını çalıştırmak buna **3** ağsız çevrimdışı yardımcı (`paymos_auth_status`, `recommend_payment_integration`, `verify_webhook_signature`) ve `30` derlenmiş `paymos://docs/*` sayfası ekleyerek toplamı **191** araca çıkarır.

Tam dokümantasyon: [Paymos MCP ve Yapay Zeka Ajanları Kılavuzu](https://paymos.io/tr/docs/mcp) · [AI Agents Ürün Sayfası](https://paymos.io/tr/product/ai-agents)

## Geliştirme

```bash
npm install                 # @paymos/sdk resolves from ../typescript-sdk
npm run build:resources     # regenerate documentation resources
npm test                    # package tests
npm run build               # bundle to dist/
```

Lisans: MIT — bkz. [LICENSE](../LICENSE).
