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

会在 **`claw-ops` 当前目录**生成类似 `edgeops-claw-ops-0.3.0.tgz` 的文件（具体文件名以 `package.json` 的 `name` / `version` 为准）。将该文件复制到目标机器后安装：

```bash
openclaw plugins install ./edgeops-claw-ops-0.3.0.tgz
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
openclaw plugins install ./edgeops-claw-ops-0.3.0.tgz
```

### 3.4 验证

```bash
openclaw plugins list
openclaw plugins inspect claw-ops
openclaw plugins doctor
```

---

## 4. EdgeOps URL 与密钥（KEY）配置

在 **`openclaw.json`** 的 `plugins` 段增加或合并如下结构（字段名需与实际 OpenClaw 版本一致；下列为常见形态）。

### 4.1 `plugins.allow`

允许加载该插件：

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
        "baseUrl": "https://your-edgeops.example.com",
        "accessToken": "eop_xxxxxxxx"
      }
    }
  }
}
```

| 字段 | 含义 |
|------|------|
| `baseUrl` | EdgeOps **根地址**，无末尾 `/`。省略时插件可能使用内置默认公网地址；**自建**请必填正确 URL。 |
| `accessToken` | EdgeOps **Bearer**：登录 JWT 或 `eop_` API Token（在 EdgeOps 系统设置中创建）。**勿**提交到仓库。 |
| `hooks.allowPromptInjection` | 建议 `true`：注入「须用 `edgeops_*`、勿本机 curl EdgeOps」等系统说明。 |

若安装方式在 `plugins.installs.claw-ops` 写了 `sourcePath`，仅影响**扩展来源路径**；**`baseUrl` / `accessToken`仍以 `plugins.entries.claw-ops.config` 为准**。

**校验配置：**

```bash
openclaw config validate
```

---

## 5. 权限与策略（OpenClaw 侧）

插件**不会**替你把网关的 exec 安全策略全部关掉；若模型仍尝试 `exec` + HTTP 调 EdgeOps，可能触发审批。

### 5.1 工具白名单（`tools.profile: coding` 等）

若使用精简工具 **profile**（如 `coding`），需把插件工具放进允许列表，否则模型**看不到** `edgeops_*`：

```json
"tools": {
  "profile": "coding",
  "alsoAllow": ["claw-ops"]
}
```

或在对应 `agents.list[].tools` 中配置等价 `alsoAllow` / `allow`（以 OpenClaw 文档为准）。**勿**在同一作用域同时设置冲突的 `allow` 与 `alsoAllow`（OpenClaw 会校验）。

### 5.2 Exec 审批（可选）

- 网关/exec 若采用 **allowlist + on-miss**，模型误用 shell 访问 EdgeOps 时会出现审批弹窗。
- 处理思路：**优先走 `edgeops_*`**；或在可信环境下调整 `exec-approvals` / 网关策略（仅管理员、自担风险）。

具体文件名与 JSON 结构以你安装的 OpenClaw 版本为准；路径均在 **用户目录下的 `.openclaw`**。

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
