# ClawOps（claw-ops）— OpenClaw 安装与配置

本文档适用于 **Windows、Linux、macOS**。ClawOps 在 **OpenClaw Gateway** 内执行：**直连 EdgeOps REST API**，**不依赖**打开 EdgeOps 网页、也**不依赖**网页里的 AI 聊天 / Web 终端 UI；运维在 **EdgeOps 服务端** 完成。

---

## 1. 前置条件

| 项 | 说明 |
|----|------|
| Node.js | **≥ 22**（与 `package.json` 的 `engines` 一致） |
| OpenClaw CLI | 已安装并在终端可用，例如 `openclaw --version` |
| EdgeOps | 可访问的根 URL；用户 **JWT** 或 **个人 API Token**（`eop_`…） |

**OpenClaw 配置目录（全平台）：**

| 系统 | 主配置路径 |
|------|------------|
| Linux / macOS | `$HOME/.openclaw/openclaw.json` |
| Windows（cmd） | `%USERPROFILE%\.openclaw\openclaw.json` |
| Windows（PowerShell） | `$env:USERPROFILE\.openclaw\openclaw.json` |

可选：`exec-approvals` 等与网关/exec 策略相关文件也在 **`.openclaw`** 下（名称以你本机 OpenClaw 版本为准，常见如 `exec-approvals.json`）。

---

## 2. 从源码打包（构建）

在克隆后的 **`claw-ops` 目录**执行（三系统命令相同）：

```bash
cd claw-ops
npm ci
npm run build
npm run check
```

- `npm run build`：生成 `dist/`（TypeScript → JavaScript）。
- 开发/调试通常也可让 OpenClaw **直接加载源码目录**（见下文 `--link`）；正式发布前建议至少执行一次 `build` 以保持与 `package.json` 约定一致。

**生成可分发的 `.tgz`（推荐用脚本，等价 `npm run pack` = `build` + `npm pack`）：**

| 系统 | 命令 |
|------|------|
| Windows | 在资源管理器中双击 `pack.bat`，或在 **`claw-ops`** 目录执行：`pack.bat` |
| Linux / macOS | `chmod +x pack.sh`（首次），在 **`claw-ops`** 目录执行：`./pack.sh` |

或直接：

```bash
npm run pack
```

会在 **`claw-ops` 当前目录**生成类似 `edgeops-claw-ops-0.7.0.tgz` 的文件（具体文件名以 `package.json` 的 `name` / `version` 为准）。将该文件复制到目标机器后安装：

```bash
openclaw plugins install ./edgeops-claw-ops-0.7.0.tgz
```

---

## 3. 安装插件（命令）

以下假定当前目录或路径已指向 **包含 `openclaw.plugin.json` 的插件根目录**。

### 3.1 本机路径安装（复制到 OpenClaw 托管目录）

**Linux / macOS**

```bash
openclaw plugins install /absolute/path/to/claw-ops
```

**Windows（PowerShell，示例）**

```powershell
openclaw plugins install "D:\path\to\claw-ops"
```

### 3.2 开发：符号链接 / 链接安装（不复制，改代码即生效）

```bash
openclaw plugins install --link /absolute/path/to/claw-ops
```

Windows 同样传入绝对路径（注意引号）。

### 3.3 从 npm 包 tarball 安装

```bash
openclaw plugins install ./edgeops-claw-ops-0.7.0.tgz
```

### 3.4 验证

```bash
openclaw plugins list
openclaw plugins inspect claw-ops
openclaw plugins doctor
```

### 3.5 从 ClawHub 安装（命令行）

插件发布到 [ClawHub](https://clawhub.ai/) 后，可用 **OpenClaw 原生命令**安装（无需先下载 `.tgz`）：

```bash
# 将 <slug> 换成 ClawHub 上该包的实际标识（与发布名称一致，以 clawhub.ai 展示为准）
openclaw plugins install clawhub:<slug>
```

示例（**占位**，真实 slug 以 ClawHub 页面为准）：

```bash
openclaw plugins install clawhub:edgeops-claw-ops
```

更新已安装的 ClawHub 插件：

```bash
openclaw plugins update --all
# 或仅更新某一插件（名称以 openclaw plugins list 为准）
openclaw plugins update claw-ops
```

安装后仍需配置 **`plugins.entries.claw-ops.config`**（见下节「全命令行配置」），并视情况配置 **`tools.alsoAllow`**（见 §5.1）。

---

## 4. EdgeOps URL、KEY 与插件开关（全命令行示例）

**配置是前置条件**：须在 `openclaw.json` 中完成 `plugins.entries.claw-ops`（**必填** `config.accessToken`，**可改** `config.baseUrl`）、以及在 `tools.profile: coding` 场景下的 `tools.alsoAllow`（含 `claw-ops`），否则 `edgeops_*` 无法正常工作。`plugins.allow` 在 OpenClaw 里为**可选**白名单：官方说明为「**若已设置（非空），则仅列表内插件可加载**」——此时**必须**包含 `"claw-ops"`；若未设置或为空，非捆绑插件仍**可能**被自动发现加载（网关会告警并建议显式列出可信 ID），故生产/多插件环境仍**强烈建议**配置 `plugins.allow` 并纳入 `claw-ops`。`appendOpenClawUiHints`、`blockLocalEdgeOpsExec` 仅写在 **`plugins.entries.claw-ops.config`**，不要写在 `hooks` 里。包内合并示例：**`openclaw.claw-ops.example.json`**。

**默认 EdgeOps 根 URL**：插件未配置 `baseUrl` 时，会回退到内置默认 **`https://ops.pinglan.cc`**（与 `client.ts` 中常量一致）。**自建实例**请显式设为你的域名；下列示例以公网默认为例。

配置均通过 **`openclaw config set`** 写入 **`openclaw.json`**。可先查看配置文件路径：

```bash
openclaw config file
```

批量写入时可用 **`--dry-run`** 先校验（见 §4.4）。

### 4.1 逐项写入（bash / macOS / Linux）

```bash
# 启用插件 + 注入路由提示（推荐）
openclaw config set plugins.entries.claw-ops.enabled true --strict-json
openclaw config set plugins.entries.claw-ops.hooks.allowPromptInjection true --strict-json

# EdgeOps 根地址（默认公网；自建请改 URL）
openclaw config set plugins.entries.claw-ops.config.baseUrl "https://ops.pinglan.cc" --strict-json

# Token：方式 A — 直接从环境变量读取（推荐，避免明文进配置文件）
# 先在 shell 中 export EDGEOPS_TOKEN='eop_xxx' 再执行：
openclaw config set plugins.entries.claw-ops.config.accessToken \
  --ref-provider default --ref-source env --ref-id EDGEOPS_TOKEN

# Token：方式 B — 明文写入（仅用于本机快速试验；勿截图、勿提交 git）
openclaw config set plugins.entries.claw-ops.config.accessToken '"eop_你的令牌"' --strict-json
```

### 4.2 逐项写入（Windows PowerShell）

```powershell
openclaw config set plugins.entries.claw-ops.enabled true --strict-json
openclaw config set plugins.entries.claw-ops.hooks.allowPromptInjection true --strict-json
openclaw config set plugins.entries.claw-ops.config.baseUrl https://ops.pinglan.cc

# Token：环境变量（推荐。先执行：$env:EDGEOPS_TOKEN = "eop_..."）
openclaw config set plugins.entries.claw-ops.config.accessToken --ref-provider default --ref-source env --ref-id EDGEOPS_TOKEN

# 明文 token 在 PowerShell 引号易踩坑，建议用 §4.4 批量文件，或 bash 运行 §4.1
```

若需一次性写入多项含字符串的配置，在 Windows 上优先 **§4.4 批量 JSON**。

### 4.3 `plugins.allow`（插件 ID 白名单，可选）

与 OpenClaw 运行时配置说明一致：`plugins.allow` 为**可选**；**仅当该数组存在且非空时**，才表示「只允许这些插件参与加载」——列表中若无 `claw-ops`，本插件将**不会**被加载。未配置或为空时，行为更宽松（非捆绑插件可能被自动发现，官方日志会提示设置显式白名单）。

仅当配置里**还没有**其它插件，或你愿意**覆盖**整个列表时：

```bash
openclaw config set plugins.allow '["claw-ops"]' --strict-json
```

若已有 `qqbot`、`google` 等，请先读出再合并，**不要把原列表覆盖掉**：

```bash
openclaw config get plugins.allow
```

将输出中的数组**加上** `"claw-ops"` 后一次性设置，例如：

```bash
openclaw config set plugins.allow '["claw-ops","qqbot","google"]' --strict-json
```

（顺序无所谓，以你本机实际插件名为准。）

### 4.4 批量写入（任选平台，推荐）

新建文件 `claw-ops-openclaw.batch.json`（内容按需改掉 token / URL）：

```json
[
  { "path": "plugins.entries.claw-ops.enabled", "value": true },
  { "path": "plugins.entries.claw-ops.hooks.allowPromptInjection", "value": true },
  { "path": "plugins.entries.claw-ops.config.baseUrl", "value": "https://ops.pinglan.cc" },
  { "path": "plugins.entries.claw-ops.config.accessToken", "value": "eop_REPLACE_ME" }
]
```

执行（**勿**把含真实 token 的文件提交到 git）：

```bash
openclaw config set --batch-file ./claw-ops-openclaw.batch.json --dry-run
openclaw config set --batch-file ./claw-ops-openclaw.batch.json
```

批量模式**不能**与 `--ref-provider` 混用；若要用环境变量引用 token，请对 `accessToken` 单独执行 **§4.1** 中的 `ref` 命令，或把 batch 里该项删掉后单独 `config set ... --ref-source env ...`。

### 4.5 与手工编辑 JSON 等价的结构（对照）

```json
"plugins": {
  "allow": ["claw-ops"],
  "entries": {
    "claw-ops": {
      "enabled": true,
      "hooks": {
        "allowPromptInjection": true
      },
      "config": {
        "baseUrl": "https://ops.pinglan.cc",
        "accessToken": "eop_xxxxxxxx"
      }
    }
  }
}
```

| 字段 | 含义 |
|------|------|
| `baseUrl` | EdgeOps **根地址**，无末尾 `/`。未设置时插件默认 **`https://ops.pinglan.cc`**；自建必填你的 URL。 |
| `accessToken` | EdgeOps **Bearer**：JWT 或 `eop_` API Token。**勿**提交到仓库；优先 **env + SecretRef**（§4.1 方式 A）。 |
| `hooks.allowPromptInjection` | 建议 `true`：注入须用 `edgeops_*`、勿本机 curl EdgeOps 等说明。 |

若 `plugins.installs.claw-ops` 中记录了 `sourcePath`，只影响**扩展来源**；**URL / TOKEN 以 `plugins.entries.claw-ops.config` 为准**。

**校验：**

```bash
openclaw config validate
```

---

## 5. 权限与策略（OpenClaw 侧，命令行 + 说明）

插件**不会**替你把网关的 exec 安全策略全部关掉；若模型仍尝试 `exec` + HTTP 调 EdgeOps，可能触发审批。

### 5.1 工具白名单（`tools.profile: coding` 等）——命令行

若使用精简工具 **profile**（如 `coding`），须把插件放进 **`tools.alsoAllow`**（或等价配置），否则模型**看不到** `edgeops_*`。

仅当列表为空或你可覆盖整个数组时：

```bash
openclaw config set tools.alsoAllow '["claw-ops"]' --strict-json
```

若已有其它项，先 `openclaw config get tools.alsoAllow`，合并后再 `config set`。**勿**在同一作用域同时配置冲突的 `tools.allow` 与 `tools.alsoAllow`（OpenClaw 会校验）。

按 agent 细粒度控制时，路径可能是 `agents.list[].tools.alsoAllow`，需编辑 `openclaw.json` 或使用支持你本机 OpenClaw 版本的 dot path（可用 `openclaw config schema` 查阅）。

### 5.2 Exec 审批（可选）

- 网关若采用 **allowlist + on-miss**，模型误用 shell 访问 EdgeOps 时会出现审批弹窗。
- **处理思路**：优先走 `edgeops_*`；在可信环境下再在 **`.openclaw`** 下调整 exec 审批相关配置（文件名以安装版本为准，如 `exec-approvals.json`）。
- 该文件多数情况下需**手工编辑**或通过 Control UI 配置；是否提供 `openclaw config set` 路径依版本而定，可将 `openclaw config schema` 的输出保存后搜索 `exec`。

### 5.3 重启 Gateway

修改 `openclaw.json` 或插件文件后：

```bash
openclaw gateway stop
# 稍等端口释放（必要时 2～5 秒）
openclaw gateway start
```

或你环境中等价的一键重启命令。

---

## 6. EdgeOps 侧权限说明（简要）

- `eop_` Token 或 JWT 能访问哪些主机、哪些 API，由 **EdgeOps 用户权限**决定。
- ClawOps 使用的集成接口为服务端 **`POST /api/integration/ops-chat/complete`** 等；需保证该令牌有权访问对应 EdgeOps 实例。

---

## 7. 常见问题

| 现象 | 建议 |
|------|------|
| 模型只会 `curl` / `Invoke-RestMethod` | 确认 `allowPromptInjection`、`tools.alsoAllow` 含 `claw-ops`，并重启 Gateway。 |
| 工具报未配置 token | 填写 `plugins.entries.claw-ops.config.accessToken`。 |
| `SSL` / 自建证书 | EdgeOps 使用 https 时，需系统/Node 信任该 CA（依部署而定）。 |
| 连接拒绝 | 检查 `baseUrl`、防火墙、EdgeOps 是否监听 `8010`/443 等。 |

---

## 8. 文档与版本

- 插件元数据：`openclaw.plugin.json`
- OpenClaw CLI 插件说明：<https://docs.openclaw.ai/cli/plugins>

若本仓库 `package.json` 中的 `openclaw.compat` / `openclaw.build` 与网关版本不匹配，发布到 ClawHub 前请按 [Plugin Setup](https://docs.openclaw.ai/plugins/sdk-setup) 更新（`build.openclawVersion`、`build.pluginSdkVersion` 需与用于 `npm run build` 的 OpenClaw 版本一致）。
