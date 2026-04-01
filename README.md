# EdgeOps · OpenClaw 插件（claw-ops）

在 [OpenClaw](https://docs.openclaw.ai/) 网关内连接 **EdgeOps**，用统一工具完成 **主机资产、探活、集成运维对话**，无需在聊天里手写 `curl` / PowerShell 调 EdgeOps API。

**npm 包**：`@edgeops/claw-ops`  
**插件 ID**：`claw-ops`（`openclaw.json` 里 `plugins.entries.claw-ops`）  
**版本**：与 EdgeOps 产品版本对齐时见 `package.json` / `openclaw.plugin.json`（当前默认与仓库 `config.py` 中 `VERSION` 一致）。

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

## 配置要点

在 `openclaw.json` 的 `plugins.entries.claw-ops` 中常见字段：

- **`baseUrl`**：EdgeOps 根地址，无尾部 `/`。未配置时默认 **`https://ops.pinglan.cc`**。
- **`accessToken`**：JWT 或 `eop_` 个人 API Token。
- **`hooks.allowPromptInjection`**：建议 `true`，启用路由提示注入。

若使用 `tools.profile: coding` 等精简工具集，需在 **`tools.alsoAllow`**（或等价策略）中加入 **`claw-ops`**，否则模型看不到插件工具。

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
