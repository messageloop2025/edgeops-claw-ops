/** EdgeOps HTTP API client for the OpenClaw plugin. */

export type ClawOpsPluginConfig = {
  baseUrl: string;
  accessToken: string;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function createEdgeOpsClient(config: ClawOpsPluginConfig) {
  const base = normalizeBaseUrl(config.baseUrl);
  const token = config.accessToken;

  async function requestJson<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `EdgeOps HTTP ${res.status}: ${text.slice(0, 800) || res.statusText}`,
      );
    }
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  return {
    async getVersion(): Promise<unknown> {
      return requestJson("/api/version", { method: "GET" });
    },

    async listHosts(): Promise<unknown> {
      return requestJson("/api/hosts", { method: "GET" });
    },

    async executeOnHost(
      hostId: number,
      command: string,
      timeout?: number,
    ): Promise<unknown> {
      const body: { command: string; timeout?: number } = { command };
      if (timeout !== undefined) body.timeout = timeout;
      return requestJson(`/api/hosts/${hostId}/execute`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
  };
}
