import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";

import { createEdgeOpsClient, type ClawOpsPluginConfig } from "./client.js";

function asConfig(raw: Record<string, unknown> | undefined): ClawOpsPluginConfig {
  const baseUrl = raw?.baseUrl;
  const accessToken = raw?.accessToken;
  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    throw new Error("claw-ops: plugins.entries.claw-ops.config.baseUrl is required");
  }
  if (typeof accessToken !== "string" || !accessToken.trim()) {
    throw new Error(
      "claw-ops: plugins.entries.claw-ops.config.accessToken is required",
    );
  }
  return { baseUrl: baseUrl.trim(), accessToken: accessToken.trim() };
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
  name: "Claw Ops (EdgeOps)",
  description: "List EdgeOps hosts, ping the gateway, and run SSH commands via EdgeOps API.",
  register(api) {
    const cfg = asConfig(api.pluginConfig as Record<string, unknown> | undefined);
    const edge = createEdgeOpsClient(cfg);

    api.registerTool({
      name: "edgeops_gateway_ping",
      label: "EdgeOps ping",
      description:
        "Check reachability of EdgeOps and read /api/version (no host access).",
      parameters: Type.Object({}),
      async execute(_id) {
        const data = await edge.getVersion();
        return okResult(data);
      },
    });

    api.registerTool({
      name: "edgeops_list_hosts",
      label: "EdgeOps list hosts",
      description:
        "List hosts visible to the current EdgeOps user (GET /api/hosts).",
      parameters: Type.Object({}),
      async execute(_id) {
        const data = await edge.listHosts();
        return okResult(data);
      },
    });

    api.registerTool(
      {
        name: "edgeops_host_execute",
        label: "EdgeOps SSH execute",
        description:
          "Run a shell command on a managed host via EdgeOps SSH (POST /api/hosts/{id}/execute). Requires host credentials configured in EdgeOps.",
        parameters: Type.Object({
          host_id: Type.Integer({
            description: "EdgeOps host primary key (id from list_hosts).",
          }),
          command: Type.String({
            description: "Shell command to run on the remote host.",
          }),
          timeout: Type.Optional(
            Type.Integer({
              minimum: 1,
              maximum: 3600,
              description: "SSH timeout in seconds (default 30 on server).",
            }),
          ),
        }),
        async execute(_id, params) {
          const data = await edge.executeOnHost(
            params.host_id,
            params.command,
            params.timeout,
          );
          return okResult(data);
        },
      },
      { optional: true },
    );
  },
});
