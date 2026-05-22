/**
 * encoding 模块测试
 * 覆盖: decode/encode 正常流程、往返测试、非法输入、边界情况
 */
import { describe, it, expect } from "vitest";
import { decode, encode } from "../../src/encoding";

// ---- decode 测试 ----

describe("decode", () => {
  describe("utf8 → bytes", () => {
    it("解码 ASCII 字符串", () => {
      const result = decode("hello", "utf8") as unknown as Uint8Array;
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(5);
      expect(result[0]).toBe(104); // 'h'
    });

    it("解码中文字符串", () => {
      const result = decode("你好", "utf8") as unknown as Uint8Array;
      expect(result.length).toBe(6);
      expect(result[0]).toBe(0xe4);
      expect(result[1]).toBe(0xbd);
      expect(result[2]).toBe(0xa0);
    });

    it("解码空字符串返回空 Uint8Array", () => {
      const result = decode("", "utf8") as unknown as Uint8Array;
      expect(result.length).toBe(0);
    });
  });

  describe("hex → bytes", () => {
    it("解码十六进制字符串", () => {
      const result = decode("68656c6c6f", "hex") as unknown as Uint8Array;
      expect(result.length).toBe(5);
      const str = new TextDecoder().decode(result);
      expect(str).toBe("hello");
    });

    it("大写十六进制也能解码", () => {
      const result = decode("ABCD", "hex") as unknown as Uint8Array;
      expect(result.length).toBe(2);
      expect(result[0]).toBe(0xab);
      expect(result[1]).toBe(0xcd);
    });

    it("空字符串返回空 Uint8Array", () => {
      const result = decode("", "hex") as unknown as Uint8Array;
      expect(result.length).toBe(0);
    });
  });

  describe("base64 → bytes", () => {
    it("解码 Base64 字符串", () => {
      const result = decode("aGVsbG8=", "base64") as unknown as Uint8Array;
      const str = new TextDecoder().decode(result);
      expect(str).toBe("hello");
    });

    it("解码无填充的 Base64", () => {
      const result = decode("aGVsbG8", "base64") as unknown as Uint8Array;
      const str = new TextDecoder().decode(result);
      expect(str).toBe("hello");
    });
  });

  describe("base64url → bytes", () => {
    it("解码 Base64URL 字符串", () => {
      const result = decode("aGVsbG8", "base64url") as unknown as Uint8Array;
      const str = new TextDecoder().decode(result);
      expect(str).toBe("hello");
    });

    it("解码含 - 和 _ 的 Base64URL", () => {
      // [0xfb, 0xff, 0xfe] 的 base64url: -__- (base64: +//+)
      const result = decode("-__-", "base64url") as unknown as Uint8Array;
      expect(result[0]).toBe(0xfb);
      expect(result[1]).toBe(0xff);
      expect(result[2]).toBe(0xfe);
    });
  });

  describe("非法输入", () => {
    it("data 非字符串抛出 TypeError", () => {
      expect(() => decode(123 as any, "utf8")).toThrow(TypeError);
      expect(() => decode(null as any, "utf8")).toThrow(TypeError);
      expect(() => decode(undefined as any, "utf8")).toThrow(TypeError);
    });

    it("from 非字符串抛出 TypeError", () => {
      expect(() => decode("hello", 123 as any)).toThrow(TypeError);
      expect(() => decode("hello", null as any)).toThrow(TypeError);
    });

    it("不支持的编码格式抛出 TypeError", () => {
      expect(() => decode("hello", "gbk" as any)).toThrow(TypeError);
      expect(() => decode("hello", "" as any)).toThrow(TypeError);
    });

    it("十六进制奇数长度抛出 Error", () => {
      expect(() => decode("abc", "hex")).toThrow(Error);
    });

    it("十六进制非法字符抛出 Error", () => {
      expect(() => decode("xyz", "hex")).toThrow(Error);
    });
  });
});

// ---- encode 测试 ----

describe("encode", () => {
  const helloBytes = new Uint8Array([104, 101, 108, 108, 111]); // "hello"

  describe("bytes → utf8", () => {
    it("编码为 UTF-8 字符串", () => {
      const result = encode(helloBytes as any, "utf8");
      expect(result).toBe("hello");
    });

    it("空 bytes 返回空字符串", () => {
      const result = encode(new Uint8Array(0) as any, "utf8");
      expect(result).toBe("");
    });
  });

  describe("bytes → hex", () => {
    it("编码为十六进制字符串", () => {
      const result = encode(helloBytes as any, "hex");
      expect(result).toBe("68656c6c6f");
    });

    it("空 bytes 返回空字符串", () => {
      const result = encode(new Uint8Array(0) as any, "hex");
      expect(result).toBe("");
    });
  });

  describe("bytes → base64", () => {
    it("编码为 Base64", () => {
      const result = encode(helloBytes as any, "base64");
      expect(result).toBe("aGVsbG8=");
    });

    it("无填充的情况", () => {
      const bytes = new Uint8Array([0x4d, 0x61, 0x6e]); // "Man"
      const result = encode(bytes as any, "base64");
      expect(result).toBe("TWFu");
    });
  });

  describe("bytes → base64url", () => {
    it("编码为 Base64URL（无等号）", () => {
      const result = encode(helloBytes as any, "base64url");
      expect(result).toBe("aGVsbG8");
    });

    it("特殊字符替换为 URL 安全版本", () => {
      const bytes = new Uint8Array([0xfb, 0xff, 0xfe]);
      const result = encode(bytes as any, "base64url");
      // base64: +//+ → base64url: -__-
      expect(result).toBe("-__-");
      expect(result).not.toContain("+");
      expect(result).not.toContain("/");
      expect(result).not.toContain("=");
    });
  });

  describe("非法输入", () => {
    it("data 非 Uint8Array 抛出 TypeError", () => {
      expect(() => encode("hello" as any, "hex")).toThrow(TypeError);
      expect(() => encode(123 as any, "hex")).toThrow(TypeError);
      expect(() => encode(null as any, "hex")).toThrow(TypeError);
    });

    it("to 非字符串抛出 TypeError", () => {
      expect(() => encode(helloBytes as any, 123 as any)).toThrow(TypeError);
    });

    it("不支持的编码格式抛出 TypeError", () => {
      expect(() => encode(helloBytes as any, "gbk" as any)).toThrow(TypeError);
    });
  });
});

// ---- 往返测试 ----

describe("encoding 往返测试", () => {
  it("utf8 → bytes → utf8", () => {
    const original = "Hello 世界 🌍";
    const bytes = decode(original, "utf8") as unknown as Uint8Array;
    const back = encode(bytes as any, "utf8");
    expect(back).toBe(original);
  });

  it("hex → bytes → hex", () => {
    const original = "deadbeef12345678";
    const bytes = decode(original, "hex") as unknown as Uint8Array;
    const back = encode(bytes as any, "hex");
    expect(back).toBe(original);
  });

  it("base64 → bytes → base64", () => {
    const original = "SGVsbG8gV29ybGQ=";
    const bytes = decode(original, "base64") as unknown as Uint8Array;
    const back = encode(bytes as any, "base64");
    expect(back).toBe(original);
  });

  it("base64url → bytes → base64url", () => {
    const original = "SGVsbG8gV29ybGQ";
    const bytes = decode(original, "base64url") as unknown as Uint8Array;
    const back = encode(bytes as any, "base64url");
    expect(back).toBe(original);
  });
});
