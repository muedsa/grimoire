import { describe, it, expect, afterEach, vi } from "vitest";
import { http_get, http_post, http_fetch } from "../../src/expression/builtins/http";

// mock fetch
const mockFetch = vi.fn<typeof fetch>();
globalThis.fetch = mockFetch;

afterEach(() => {
  mockFetch.mockClear();
});

/** 辅助：构造标准 mock Response */
function mockResponse(
  status: number,
  body: string,
  headers?: Record<string, string>,
) {
  const h = new Headers(headers);
  return new Response(body, { status, headers: h });
}

// ========== http_get ==========

describe("http_get", () => {
  it("成功 GET 请求返回 HttpResponse", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, '{"ok":true}', { "Content-Type": "application/json" }),
    );
    const result = await http_get("https://api.example.com/data");
    expect(result).toEqual({
      status: 200,
      headers: expect.objectContaining({ "content-type": "application/json" }),
      body: '{"ok":true}',
    });
  });

  it("带请求头的 GET 请求", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));
    await http_get("https://api.example.com/data", {
      Authorization: "Bearer xxx",
    });
    const calledUrl = mockFetch.mock.calls[0][0];
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledUrl).toBe("https://api.example.com/data");
    expect(calledOptions.method).toBe("GET");
    expect(typeof calledOptions.headers).toBe("object");
  });

  it("无请求头的 GET 请求", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));
    await http_get("https://api.example.com/data");
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledOptions.method).toBe("GET");
  });

  it("网络错误返回 network_error", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const result = await http_get("https://api.example.com/data");
    expect(result).toEqual({
      status: 0,
      headers: {},
      body: "",
      error: "network_error",
    });
  });

  it("非 2xx 状态码正常返回（不视作错误）", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404, "Not Found"));
    const result = await http_get("https://api.example.com/missing");
    expect(result.status).toBe(404);
    expect(result.body).toBe("Not Found");
    expect(result.error).toBeUndefined();
  });

  it("非字符串 url 返回 null", async () => {
    expect(await http_get(123 as any)).toBeNull();
    expect(await http_get(null as any)).toBeNull();
  });
});

// ========== http_post ==========

describe("http_post", () => {
  it("string body 直接透传", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(201, "created"));
    await http_post("https://api.example.com/resource", '{"x":1}', {
      "Content-Type": "application/json",
    });
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledOptions.method).toBe("POST");
    expect(calledOptions.body).toBe('{"x":1}');
  });

  it("object body + application/json → JSON.stringify", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(201, "created"));
    await http_post(
      "https://api.example.com/resource",
      { x: 1, y: 2 },
      { "Content-Type": "application/json" },
    );
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(calledOptions.body as string)).toEqual({ x: 1, y: 2 });
  });

  it("object body + x-www-form-urlencoded → URLSearchParams", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));
    await http_post(
      "https://api.example.com/form",
      { name: "foo", age: "20" },
      { "Content-Type": "application/x-www-form-urlencoded" },
    );
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledOptions.body).toBe("name=foo&age=20");
  });

  it("object body + multipart/form-data → 自动生成 boundary", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));
    await http_post(
      "https://api.example.com/upload",
      { name: "foo", age: "20" },
      { "Content-Type": "multipart/form-data" },
    );
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    const body = calledOptions.body as string;
    expect(body).toContain('Content-Disposition: form-data; name="name"');
    expect(body).toContain('Content-Disposition: form-data; name="age"');
    expect(body).toContain("foo");
    expect(body).toContain("20");
  });

  it("object body + 不支持的 Content-Type 返回 unsupported_content_type", async () => {
    const result = await http_post(
      "https://api.example.com/data",
      { x: 1 },
      { "Content-Type": "text/plain" },
    );
    expect(result).toEqual({
      status: 0,
      headers: {},
      body: "",
      error: "unsupported_content_type",
    });
  });

  it("object body + 无 Content-Type → unsupported_content_type", async () => {
    const result = await http_post("https://api.example.com/data", { x: 1 });
    expect(result).toEqual({
      status: 0,
      headers: {},
      body: "",
      error: "unsupported_content_type",
    });
  });

  it("无 body 的 POST 请求", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));
    await http_post("https://api.example.com/data");
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledOptions.method).toBe("POST");
    expect(calledOptions.body).toBeUndefined();
  });

  it("仅 url 和 body，无 headers", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));
    await http_post("https://api.example.com/data", "raw body");
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledOptions.body).toBe("raw body");
  });

  it("非字符串 url 返回 null", async () => {
    expect(await http_post(null as any, "{}")).toBeNull();
    expect(await http_post(undefined as any, "{}")).toBeNull();
  });
});

// ========== http_fetch ==========

describe("http_fetch", () => {
  it("自定义 method (DELETE)", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "deleted"));
    await http_fetch("https://api.example.com/data/1", { method: "DELETE" });
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledOptions.method).toBe("DELETE");
  });

  it("默认 method 为 GET", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));
    await http_fetch("https://api.example.com/data");
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledOptions.method).toBe("GET");
  });

  it("body 序列化 — object + JSON", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));
    await http_fetch("https://api.example.com/data", {
      method: "PUT",
      body: { x: 1 },
      headers: { "Content-Type": "application/json" },
    });
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(calledOptions.body as string)).toEqual({ x: 1 });
  });

  it("string body 直接透传", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));
    await http_fetch("https://api.example.com/data", {
      method: "PUT",
      body: "raw text",
      headers: { "Content-Type": "text/plain" },
    });
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledOptions.body).toBe("raw text");
  });

  it("超时返回 timeout error", async () => {
    const abortError = new DOMException(
      "The operation was aborted.",
      "AbortError",
    );
    mockFetch.mockRejectedValueOnce(abortError);
    const result = await http_fetch("https://api.example.com/slow", {
      timeout: 100,
    });
    expect(result).toEqual({
      status: 0,
      headers: {},
      body: "",
      error: "timeout",
    });
  });

  it("无 options 时正常使用默认值", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));
    const result = await http_fetch("https://api.example.com/data");
    expect(result.status).toBe(200);
  });

  it("options 为 null/undefined 时正常使用默认值", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));
    const result = await http_fetch(
      "https://api.example.com/data",
      undefined as any,
    );
    expect(result.status).toBe(200);
  });

  it("非字符串 url 返回 null", async () => {
    expect(await http_fetch(123 as any)).toBeNull();
    expect(await http_fetch(null as any)).toBeNull();
  });

  it("网络错误（非 AbortError）返回 network_error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ENOTFOUND"));
    const result = await http_fetch("https://api.example.com/data");
    expect(result).toEqual({
      status: 0,
      headers: {},
      body: "",
      error: "network_error",
    });
  });
});
