import { DEFAULT_EDGEOPS_BASE_URL } from "./client.js";

/**
 * 注入到 Agent 系统提示（prependSystemContext），强调 ClawOps / EdgeOps 运维能力走 edgeops_* 远程工具，
 * 不要求、也不应在 OpenClaw 本机 exec/curl 调 EdgeOps。
 */
export function buildClawOpsPrependSystemContext(baseUrl: string): string {
  const root = (baseUrl || DEFAULT_EDGEOPS_BASE_URL).trim();
  return [
    "## ClawOps（claw-ops）· EdgeOps 运维插件",
    `- **OpenClaw 配置（前提）**：须在 \`openclaw.json\` 中启用本插件并填写 **必填** 的 \`plugins.entries.claw-ops.config.accessToken\`（EdgeOps JWT 或 \`eop_\`），**可选/可改** 的 \`config.baseUrl\`（默认 \`${root}\`）；\`plugins.allow\` 须含 \`claw-ops\`；使用 \`tools.profile: coding\` 时 **还须** \`tools.alsoAllow\` 含 \`claw-ops\`。缺任一项则 \`edgeops_*\` 不可用或不出现在工具列表。详见插件包内 \`openclaw.claw-ops.example.json\`。`,
    `- **执行流（无 EdgeOps Web 页逻辑）**：ClawOps 只在 **OpenClaw Gateway / 插件进程** 内运行；工具通过 **HTTP 直接访问 EdgeOps REST API**（如 /api/integration/ops-chat/complete）。**不依赖**打开 EdgeOps 浏览器界面、**不依赖**网页里的「AI 聊天 / 主机终端」DOM 或 WebSocket 控制台；运维推理在 **EdgeOps 服务端** 完成，与是否有人打开网页无关。`,
    `- **关键词**：只要涉及 **运维 / ops / EdgeOps / ClawOps / 主机 / 服务器 / 巡检 / 排障 / 变更 / 配置 / 上线** 等与 EdgeOps 平台相关的意图，**优先**使用本插件的 \`edgeops_*\` 工具（ClawOps 路由），不要用「自己写 HTTP」或本机 shell 模拟同款能力。`,
    `- **edgeops_gateway_ping**：探活 EdgeOps、查服务端版本（运维入口健康检查）。`,
    `- **edgeops_list_hosts**：主机清单、按 IP/名称匹配资产、分页查询（资产运维 / 运维台账）。`,
    `- **edgeops_ops_chat**：把 **自然语言运维需求** 交给 EdgeOps 侧 **集成运维 Agent**（远程执行 full ops 推理与工具）；复杂排障、多步运维、需服务端 Agent 时用它。`,
    `- 所有对 EdgeOps 的 **HTTP API 与运维 AI** 已由本插件封装；执行在 **EdgeOps 服务端**，**禁止**在 OpenClaw 本机用 exec / PowerShell / bash / curl / Invoke-RestMethod / fetch 请求 \`${root}\` 下 /api/hosts、/api/version、/api/integration/…。**Bearer 仅用插件配置，禁止**在命令或回复里拼接 \`eop_\`。`,
    `- 需要结构化主机数据：先 \`edgeops_list_hosts\`，再在回复用 Markdown 概括；不要重复本地打同一接口。`,
  ].join("\n");
}
