import { AllowedValue } from "../../types/node";
import { CustomFunction } from "../evaluator";

// ========== HTTP 内置函数 helpers ==========

/** HTTP 请求返回类型 */
interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  error?: string;
}

/** 根据 Content-Type 序列化请求体，返回 null 表示不支持该 Content-Type */
function serializeHttpBody(
  body: AllowedValue,
  contentType: string,
): string | null {
  if (typeof body === "string") return body;
  if (typeof body === "object" && body !== null) {
    const ct = contentType.toLowerCase();
    if (ct.includes("application/json")) {
      return JSON.stringify(body);
    }
    if (ct.includes("x-www-form-urlencoded")) {
      return new URLSearchParams(body as Record<string, string>).toString();
    }
    if (ct.includes("multipart/form-data")) {
      const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
      const entries = Object.entries(body as Record<string, string>);
      const parts = entries.map(
        ([key, value]) =>
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
      );
      return parts.join("") + `--${boundary}--`;
    }
    return null; // 不支持的 Content-Type
  }
  return null; // body 不是 string 也不是 object
}

/** 将 fetch Response 转为 HttpResponse */
async function responseToHttpResult(response: Response): Promise<HttpResponse> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const body = await response.text();
  return { status: response.status, headers, body };
}

/** 核心：执行带超时的 HTTP 请求 */
async function doHttpRequest(
  url: string,
  method: string,
  body: AllowedValue | undefined,
  reqHeaders: Record<string, string> | undefined,
  timeout: number,
): Promise<HttpResponse> {
  const headers = new Headers(reqHeaders);

  let serializedBody: string | undefined;
  if (body !== undefined && body !== null) {
    const contentType = (
      reqHeaders?.["Content-Type"] ||
      reqHeaders?.["content-type"] ||
      ""
    ).toLowerCase();
    if (contentType) {
      const result = serializeHttpBody(body, contentType);
      if (result === null) {
        return {
          status: 0,
          headers: {},
          body: "",
          error: "unsupported_content_type",
        };
      }
      serializedBody = result;
    } else if (typeof body === "string") {
      serializedBody = body;
    } else {
      return {
        status: 0,
        headers: {},
        body: "",
        error: "unsupported_content_type",
      };
    }
  }

  const init: RequestInit = { method, headers };
  if (serializedBody !== undefined) {
    init.body = serializedBody;
  }

  if (timeout > 0) {
    const controller = new AbortController();
    init.signal = controller.signal;
    setTimeout(() => controller.abort(), timeout);
  }

  try {
    const response = await fetch(url, init);
    return responseToHttpResult(response);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { status: 0, headers: {}, body: "", error: "timeout" };
    }
    return { status: 0, headers: {}, body: "", error: "network_error" };
  }
}

/**
 * HTTP 内置函数（http_* 前缀）
 * async 函数通过 cast 兼容 CustomFunction 类型
 */
const httpBuiltinDefs = {
  http_get: async (url: AllowedValue, headers?: AllowedValue) => {
    if (typeof url !== "string") return null;
    return doHttpRequest(
      url,
      "GET",
      undefined,
      typeof headers === "object" && headers !== null && !Array.isArray(headers)
        ? (headers as Record<string, string>)
        : undefined,
      0,
    );
  },
  http_post: async (
    url: AllowedValue,
    body?: AllowedValue,
    headers?: AllowedValue,
  ) => {
    if (typeof url !== "string") return null;
    return doHttpRequest(
      url,
      "POST",
      body,
      typeof headers === "object" && headers !== null && !Array.isArray(headers)
        ? (headers as Record<string, string>)
        : undefined,
      0,
    );
  },
  http_fetch: async (url: AllowedValue, options?: AllowedValue) => {
    if (typeof url !== "string") return null;
    const opts =
      typeof options === "object" && options !== null && !Array.isArray(options)
        ? (options as Record<string, AllowedValue>)
        : {};
    const method = typeof opts.method === "string" ? opts.method : "GET";
    const body = opts.body;
    const headers =
      typeof opts.headers === "object" &&
      opts.headers !== null &&
      !Array.isArray(opts.headers)
        ? (opts.headers as Record<string, string>)
        : undefined;
    const timeout = typeof opts.timeout === "number" ? opts.timeout : 0;
    return doHttpRequest(url, method, body, headers, timeout);
  },
};

export const httpBuiltins: Record<string, CustomFunction> =
  httpBuiltinDefs as unknown as Record<string, CustomFunction>;

// ========== HTTP 内置函数的具名导出（供外部直接引用，主要用于测试） ==========

/** HTTP GET 请求 */
export async function http_get(
  url: AllowedValue,
  headers?: AllowedValue,
): Promise<AllowedValue> {
  return httpBuiltins.http_get(url, headers);
}

/** HTTP POST 请求 */
export async function http_post(
  url: AllowedValue,
  body?: AllowedValue,
  headers?: AllowedValue,
): Promise<AllowedValue> {
  return httpBuiltins.http_post(url, body, headers);
}

/** HTTP 通用请求 */
export async function http_fetch(
  url: AllowedValue,
  options?: AllowedValue,
): Promise<AllowedValue> {
  return httpBuiltins.http_fetch(url, options);
}
