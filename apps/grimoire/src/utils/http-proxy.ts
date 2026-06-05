import { AllowedValue, CustomFunction } from "@grimoire/rune";

export type ProxyReqBody = {
  url: string;
  options: RequestInit;
};

/** HTTP 请求返回类型 */
interface RuneHttpResponse {
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
async function responseToHttpResult(
  response: Response,
): Promise<RuneHttpResponse> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const body = await response.text();
  return { status: response.status, headers, body };
}

async function doHttpRequest(
  url: string,
  method: string,
  body: AllowedValue | undefined,
  reqHeaders: Record<string, string> | undefined,
  timeout: number,
): Promise<RuneHttpResponse> {
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
    const body = {
      url: url,
      options: init,
    };
    const response = await fetch("/proxy", {
      method: "post",
      body: JSON.stringify(body),
    });
    return responseToHttpResult(response);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { status: 0, headers: {}, body: "", error: "timeout" };
    }
    return { status: 0, headers: {}, body: "", error: "network_error" };
  }
}

const proxiedRuneHttpFunctionDefs = {
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
} as Record<string, CustomFunction>;

export const proxiedRuneHttpFunctions: Record<string, CustomFunction> =
  proxiedRuneHttpFunctionDefs as unknown as Record<string, CustomFunction>;
