/** EdgeOps HTTP API client for the OpenClaw plugin. */

/** OpenClaw 未配置 `baseUrl` 时使用的默认 EdgeOps 根地址；可通过插件配置覆盖。 */
export const DEFAULT_EDGEOPS_BASE_URL = "https://ops.pinglan.cc";

export type ClawOpsPluginConfig = {
  baseUrl: string;
  accessToken: string;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/** 与 EdgeOps httpx read=300s 对齐，略留余量。 */
const DEFAULT_FETCH_TIMEOUT_MS = 330_000;

export type OpsChatCompleteResponse = {
  success?: boolean;
  reply?: string;
  session_id?: number;
  error?: string;
  note?: string;
};

export type ListHostsResponse = {
  success?: boolean;
  hosts?: unknown[];
  total?: number;
  page?: number;
  page_size?: number;
};

export function createEdgeOpsClient(config: ClawOpsPluginConfig) {
  const base = normalizeBaseUrl(config.baseUrl);
  const token = config.accessToken;

  async function requestJson<T>(
    path: string,
    init?: RequestInit,
    options?: { timeoutMs?: number },
  ): Promise<T> {
    const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
    const ownSignal =
      typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? AbortSignal.timeout(timeoutMs)
        : undefined;
    const signal =
      init?.signal !== undefined ? init.signal : ownSignal;
    const res = await fetch(url, {
      ...init,
      ...(signal !== undefined ? { signal } : {}),
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
        `EdgeOps HTTP ${res.status}: ${text.slice(0, 1_000) || res.statusText}`,
      );
    }
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`EdgeOps returned non-JSON (${text.slice(0, 280)}…)`);
    }
  }

  return {
    async getVersion(): Promise<unknown> {
      return requestJson("/api/version", { method: "GET" }, { timeoutMs: 15_000 });
    },

    /**
     * 列出当前令牌可见的主机（GET /api/hosts），与 curl 行为一致。
     * EdgeOps 支持分页：page 从 1 起，page_size 最大 100。
     */
    async listHosts(params?: {
      page?: number;
      page_size?: number;
    }): Promise<ListHostsResponse> {
      const page = params?.page ?? 1;
      const page_size = Math.min(100, Math.max(1, params?.page_size ?? 100));
      const q = new URLSearchParams({
        page: String(page),
        page_size: String(page_size),
      });
      return requestJson<ListHostsResponse>(
        `/api/hosts?${q}`,
        { method: "GET" },
        { timeoutMs: 60_000 },
      );
    },

    /** 纯后台运维 AI（POST /api/integration/ops-chat/complete），与网页 /api/ai/chat 分离。 */
    async opsChatComplete(body: {
      message: string;
      session_id?: number | null;
      host_id?: number | null;
      skip_secondary_assistant?: boolean;
    }): Promise<OpsChatCompleteResponse> {
      return requestJson<OpsChatCompleteResponse>(
        "/api/integration/ops-chat/complete",
        {
          method: "POST",
          body: JSON.stringify({
            message: body.message,
            session_id: body.session_id ?? undefined,
            host_id: body.host_id ?? undefined,
            skip_secondary_assistant:
              body.skip_secondary_assistant !== false,
          }),
        },
        { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS },
      );
    },
  };
}
