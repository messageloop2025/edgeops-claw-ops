import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";

import { createEdgeOpsClient, DEFAULT_EDGEOPS_BASE_URL } from "./client.js";
import { shouldBlockLocalEdgeOpsShell } from "./edgeops-exec-guard.js";
import { OPENCLAW_DOWNSTREAM_FORMAT_BLOCK } from "./openclaw-output-policy.js";
import { buildClawOpsPrependSystemContext } from "./openclaw-system-prompt.js";

/** 安装/启动时可无 token；调用工具前再校验。 */
function resolvePluginConfig(raw: Record<string, unknown> | undefined): {
  baseUrl: string;
  accessToken?: string;
  /** 在 ops-chat 消息末尾附加 OpenClaw 展示能力说明（默认 true） */
  appendOpenClawUiHints: boolean;
  /** 拦截本机 exec/curl 等对 EdgeOps 的 HTTP（默认 true） */
  blockLocalEdgeOpsExec: boolean;
} {
  const rawBase = raw?.baseUrl;
  const baseUrl =
    typeof rawBase === "string" && rawBase.trim()
      ? rawBase.trim()
      : DEFAULT_EDGEOPS_BASE_URL;
  const accessToken = raw?.accessToken;
  const token =
    typeof accessToken === "string" && accessToken.trim()
      ? accessToken.trim()
      : undefined;
  const appendRaw = raw?.appendOpenClawUiHints;
  const appendOpenClawUiHints =
    appendRaw === undefined || appendRaw === null
      ? true
      : Boolean(appendRaw);
  const blockRaw = raw?.blockLocalEdgeOpsExec;
  const blockLocalEdgeOpsExec =
    blockRaw === undefined || blockRaw === null ? true : Boolean(blockRaw);
  return {
    baseUrl,
    accessToken: token,
    appendOpenClawUiHints,
    blockLocalEdgeOpsExec,
  };
}

function clientOrThrow(cfg: ReturnType<typeof resolvePluginConfig>) {
  if (!cfg.accessToken) {
    throw new Error(
      "claw-ops: 请在 OpenClaw 配置的 plugins.entries.claw-ops.config 中设置 accessToken（EdgeOps JWT 或 eop_...）",
    );
  }
  return createEdgeOpsClient({
    baseUrl: cfg.baseUrl,
    accessToken: cfg.accessToken,
  });
}

function jsonText(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function okResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: jsonText(data) }],
    details: data,
  };
}

export default definePluginEntry({
  id: "claw-ops",
  name: "EdgeOps",
  description:
    "**ClawOps (claw-ops) — EdgeOps 运维 / ops for OpenClaw; no EdgeOps Web UI required.** Tools run inside the Gateway and call EdgeOps HTTP APIs only (no browser terminal / page logic). Host inventory, health, ops chat → **edgeops_***. **Never** exec/curl EdgeOps; Bearer in plugin config. **edgeops_ops_chat** = remote EdgeOps integration ops agent.",
  register(api) {
    const cfg = resolvePluginConfig(
      api.pluginConfig as Record<string, unknown> | undefined,
    );

    api.on("before_prompt_build", () => ({
      prependSystemContext: buildClawOpsPrependSystemContext(cfg.baseUrl),
    }));

    api.on("before_tool_call", (event) => {
      if (!cfg.blockLocalEdgeOpsExec) {
        return;
      }
      if (
        shouldBlockLocalEdgeOpsShell({
          toolName: event.toolName,
          params: event.params,
          baseUrl: cfg.baseUrl,
        })
      ) {
        return {
          block: true,
          blockReason:
            "ClawOps（claw-ops）/ EdgeOps 运维请走插件工具：edgeops_list_hosts、edgeops_gateway_ping、edgeops_ops_chat；勿在本机 exec/curl 请求 EdgeOps。",
        };
      }
    });

    api.registerTool({
      name: "edgeops_gateway_ping",
      label: "EdgeOps 运维 · 探活",
      description:
        "**ClawOps / EdgeOps ops**：检查 EdgeOps 服务是否可达（GET /api/version）。运维排障前先 ping。**禁止**用 exec / curl / Invoke-RestMethod 打 /api/version — 仅用本工具。",
      parameters: Type.Object({}),
      async execute(_id) {
        const data = await clientOrThrow(cfg).getVersion();
        return okResult(data);
      },
    });

    api.registerTool({
      name: "edgeops_list_hosts",
      label: "EdgeOps 运维 · 主机列表",
      description:
        "**ClawOps — EdgeOps 资产运维 / 主机运维**：列出 EdgeOps 管理的主机（库存、巡检对象、IP/名称匹配、分页）。GET /api/hosts，凭证在插件内。 " +
        "Whenever user asks 主机列表 / 服务器 / 资产 / ops 盘点，**必须**用本工具。 " +
        "**Forbidden**: exec / curl / Invoke-RestMethod / fetch 访问 …/api/hosts。**Never** expose `eop_`. " +
        "Summarize as simple Markdown table or bullets (no Mermaid/ECharts).",
      parameters: Type.Object({
        page: Type.Optional(
          Type.Integer({
            minimum: 1,
            description: "Page number (default 1).",
          }),
        ),
        page_size: Type.Optional(
          Type.Integer({
            minimum: 1,
            maximum: 100,
            description: "Page size (default 100, max 100).",
          }),
        ),
      }),
      async execute(_id, params) {
        const data = await clientOrThrow(cfg).listHosts({
          page: params.page,
          page_size: params.page_size,
        });
        return okResult(data);
      },
    });

    api.registerTool({
      name: "edgeops_ops_chat",
      label: "EdgeOps 运维 · ops 对话",
      description:
        "**ClawOps — EdgeOps 运维 / ops**：用自然语言把 **运维、排障、变更、配置、上线协助** 交给 EdgeOps **集成运维 Agent**（POST …/ops-chat/complete）。服务端完整 Agent + 工具链；返回面向 OpenClaw 的 Markdown。 " +
        "用户说「帮我看下服务」「改配置」「SSH/主机问题」「运维怎么做」等 — **优先**本工具而非本机 shell。 " +
        "**Forbidden**: exec/curl POST integration。**Reuse** session_id 多轮；新开可传 host_id。勿泄露 token；appendOpenClawUiHints 可附加展示约束。",
      parameters: Type.Object({
        message: Type.String({
          description:
            "运维 / ops 需求原文：交给 EdgeOps 集成 Agent 的具体目标（排障、变更、配置、主机范围等）。插件可自动附加 OpenClaw 展示约束。",
        }),
        session_id: Type.Optional(
          Type.Integer({
            description:
              "Previous session_id from this tool's response to continue the same integration conversation.",
          }),
        ),
        host_id: Type.Optional(
          Type.Integer({
            description:
              "When starting a new session, optionally bind context to this host id in EdgeOps.",
          }),
        ),
        skip_secondary_assistant: Type.Optional(
          Type.Boolean({
            description:
              "Default true: single agent round style (recommended for OpenClaw). Set false to allow EdgeOps secondary assistant rounds if configured.",
          }),
        ),
      }),
      async execute(_id, params) {
        let message = (params.message ?? "").trim();
        if (cfg.appendOpenClawUiHints && message) {
          message = `${message}\n\n${OPENCLAW_DOWNSTREAM_FORMAT_BLOCK}`;
        }
        const data = await clientOrThrow(cfg).opsChatComplete({
          message,
          session_id: params.session_id,
          host_id: params.host_id,
          skip_secondary_assistant: params.skip_secondary_assistant,
        });
        return okResult(data);
      },
    });
  },
});
