# EdgeOps · OpenClaw 插件（claw-ops）

在 [OpenClaw](https://docs.openclaw.ai/) 网关内连接 **EdgeOps**，用统一工具完成 **主机资产、探活、集成运维对话**，无需在聊天里手写 `curl` / PowerShell 调 EdgeOps API。

**npm 包名**：`@edgeops/claw-ops`（需在 registry 发布后，方可用于 **`openclaw plugins install @edgeops/claw-ops@<版本>`**；未发布时正常现象）  
**插件 ID**：`claw-ops`（`openclaw.json` 里 `plugins.entries.claw-ops`）  
**版本**：见 `package.json` / `openclaw.plugin.json`（与 EdgeOps 产品对齐时可对照仓库 `config.py` 中 `VERSION`）。

**安装（不依赖 ClawHub 时推荐）**  
- **离线包**：仓库内 `npm run pack` → 将生成的 **`edgeops-claw-ops-*.tgz`** 拷到目标机 → `openclaw plugins install <tgz 路径>`。  
- **npm**：包已 **`npm publish`** 后 → `openclaw plugins install @edgeops/claw-ops@x.y.z`（**`x.y.z`** 与 `package.json` 的 `version` 一致；或用 `@latest` 等 **tag**，勿写 `npm:` 前缀、勿用 `^` 范围）。ClawHub 忙/429 时作用域包可能仍先撞 ClawHub，**优先用离线 `.tgz` 或本地目录安装**。  
- **npm 装不上/很慢**：可先设 **`npm_config_registry`**（如 `https://registry.npmmirror.com`）再执行 `openclaw plugins install …`，与常见 `npx … --registry=…` 同类；**不能**解决 ClawHub 限流，详见 **[OPENCLAW_INSTALL.md §3.7](./OPENCLAW_INSTALL.md)**。  
- **ClawHub 慢 / 429**：可配置 **`CLAWHUB_SITE`** 与 **`CLAWHUB_REGISTRY`** 指向国内镜像 [https://mirror-cn.clawhub.com](https://mirror-cn.clawhub.com)，详见 **[OPENCLAW_INSTALL.md](./OPENCLAW_INSTALL.md)**（§3.6 · 国内镜像）。  
- 详表与 ClawHub 说明见 **[OPENCLAW_INSTALL.md §3](./OPENCLAW_INSTALL.md)**。

---

## 功能概览

| 能力 | 工具名 | 说明 |
|------|--------|------|
| **探活 / 版本** | `edgeops_gateway_ping` | `GET /api/version`，检查 EdgeOps 服务是否可达。 |
| **主机列表** | `edgeops_list_hosts` | `GET /api/hosts`（支持分页），用于资产盘点、按 IP/名称检索主机。 |
| **运维对话** | `edgeops_ops_chat` | `POST /api/integration/ops-chat/complete`，将自然语言运维需求交给 EdgeOps **集成运维 Agent**（服务端 Agent + 工具；适合排障、变更说明、多步运维）。 |

所有 HTTP 均在 **OpenClaw Gateway / 插件进程** 内通过 `fetch` 完成；**Bearer** 只来自插件配置 **或** OpenClaw 密钥引用，不应出现在本机 `exec` 或用户粘贴的命令里。

---

## 执行方式（与网页的关系）

- **不依赖**打开 EdgeOps **浏览器界面**，也**不依赖**网页里的 AI 聊天区、Web 终端 DOM。
- 集成路径对应 EdgeOps 的 **`session_scope: integration`** 会话：在服务端完成推理与工具调用，与是否有人开着网页无关。
- 插件会在 **`before_prompt_build`** 注入系统说明，引导模型优先使用 **`edgeops_*`**；可选在 **`before_tool_call`** 拦截指向已配置 EdgeOps 的 `exec` 类调用（`blockLocalEdgeOpsExec`，默认开启）。

---

## 配置要点（必须配齐才能工作）

**未在 `openclaw.json` 中正确配置时，`edgeops_*` 不可用或不会出现在模型工具列表中。**

| 项 | 说明 |
|----|------|
| `plugins.allow` | **可选**。若配置了**非空** `plugins.allow`，则**必须**含 **`"claw-ops"`** 才会加载本插件；未配置或为空时插件仍可能被自动发现（官方会建议改为显式白名单）。 |
| `plugins.entries.claw-ops` | `enabled: true`；`hooks.allowPromptInjection` 建议 **`true`**。 |
| `plugins.entries.claw-ops.config.baseUrl` | **可修改**；省略时默认 **`https://ops.pinglan.cc`**（自建请填实际根地址，无尾斜杠）。 |
| `plugins.entries.claw-ops.config.accessToken` | **必填**（EdgeOps JWT 或 **`eop_`** Token）。 |
| `config.appendOpenClawUiHints` / `config.blockLocalEdgeOpsExec` | 写在 **`config`** 下（**不是** `hooks`）；可按需设为 `true`/`false`。 |
| `tools.alsoAllow` | 使用 **`tools.profile: coding`** 等精简集时须含 **`"claw-ops"`**。 |

完整可合并示例：**[openclaw.claw-ops.example.json](./openclaw.claw-ops.example.json)**（填入真实 `accessToken` 后合并进 `~/.openclaw/openclaw.json`）。

详细安装、命令行改配置、ClawHub、打包与跨平台说明见 **[OPENCLAW_INSTALL.md](./OPENCLAW_INSTALL.md)**。

---

## 环境要求

- **Node.js** ≥ 22  
- **OpenClaw** CLI / Gateway 版本满足 `package.json` 中 `openclaw.compat` 与 `openclaw.build` 要求  
- 可访问的 **EdgeOps** 实例与有效令牌  

---

## 开发与仓库

- 源码：<https://github.com/messageloop2025/edgeops-claw-ops>  
- 构建：`npm run build`（输出 `dist/`）  
- 打本地包：`npm run pack` 或 `./pack.sh` / `pack.bat`  

发布至 npm / ClawHub 前请阅读 `OPENCLAW_INSTALL.md` 与 [OpenClaw Plugin Setup](https://docs.openclaw.ai/plugins/sdk-setup)。

---

## 许可证

**MIT-0**（[MIT No Attribution](https://spdx.org/licenses/MIT-0.html)）：与常见 MIT 类似，但**不要求**再分发时附带版权或许可正文。全文见仓库根目录 [`LICENSE`](./LICENSE)；`package.json` 中 `license` 字段为 `MIT-0`。
