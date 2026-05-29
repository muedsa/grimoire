/**
 * encoding 模块测试
 * 覆盖: decode/encode 正常流程、往返测试、非法输入、边界情况
 */
import { describe, it, expect } from "vitest";
import {
  decode,
  encode,
  encodeUriComponent,
  decodeUriComponent,
  encodeUri,
  decodeUri,
  htmlEntityDecode,
  htmlEntityEncode,
} from "../../src/encoding";

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

// ---- URI 编解码测试 ----

describe("URI 编解码", () => {
  describe("encodeUriComponent", () => {
    it("编码特殊字符", () => {
      const result = encodeUriComponent("hello world");
      expect(result).toBe("hello%20world");
    });

    it("编码中文", () => {
      const result = encodeUriComponent("你好");
      expect(result).toBe("%E4%BD%A0%E5%A5%BD");
    });

    it("编码 URI 保留字符", () => {
      const result = encodeUriComponent("a=1&b=2");
      expect(result).toBe("a%3D1%26b%3D2");
    });

    it("不编码字母数字和 - _ . ! ~ * ' ( )", () => {
      const result = encodeUriComponent("abc123-_.!~*'()");
      expect(result).toBe("abc123-_.!~*'()");
    });

    it("空字符串", () => {
      expect(encodeUriComponent("")).toBe("");
    });
  });

  describe("decodeUriComponent", () => {
    it("解码百分号编码", () => {
      const result = decodeUriComponent("hello%20world");
      expect(result).toBe("hello world");
    });

    it("解码中文", () => {
      const result = decodeUriComponent("%E4%BD%A0%E5%A5%BD");
      expect(result).toBe("你好");
    });

    it("往返测试", () => {
      const original = "Hello 世界!@#$";
      const encoded = encodeUriComponent(original) as string;
      const decoded = decodeUriComponent(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe("encodeUri", () => {
    it("编码完整 URI（保留协议、域名等保留字符）", () => {
      const result = encodeUri("https://example.com/搜索?q=你好");
      expect(result).toBe("https://example.com/%E6%90%9C%E7%B4%A2?q=%E4%BD%A0%E5%A5%BD");
    });

    it("不编码 URI 保留字符 : / ? # @ & =", () => {
      const result = encodeUri("http://a.com/path?q=1&r=2#top");
      expect(result).toBe("http://a.com/path?q=1&r=2#top");
    });

    it("空字符串", () => {
      expect(encodeUri("")).toBe("");
    });
  });

  describe("decodeUri", () => {
    it("解码 URI", () => {
      const result = decodeUri("https://example.com/%E6%90%9C%E7%B4%A2?q=%E4%BD%A0%E5%A5%BD");
      expect(result).toBe("https://example.com/搜索?q=你好");
    });

    it("往返测试", () => {
      const original = "https://example.com/path?name=你好&type=1";
      const encoded = encodeUri(original) as string;
      const decoded = decodeUri(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe("URI 非法输入", () => {
    const cases = [
      { fn: encodeUriComponent, name: "encode_uri_component" },
      { fn: decodeUriComponent, name: "decode_uri_component" },
      { fn: encodeUri, name: "encode_uri" },
      { fn: decodeUri, name: "decode_uri" },
    ];

    cases.forEach(({ fn, name }) => {
      it(`${name} 非字符串参数抛出 TypeError`, () => {
        expect(() => fn(123 as any)).toThrow(TypeError);
        expect(() => fn(null as any)).toThrow(TypeError);
        expect(() => fn(undefined as any)).toThrow(TypeError);
      });
    });
  });
});

// ---- HTML 实体编解码测试 ----

describe("HTML 实体编解码", () => {
  describe("htmlEntityDecode", () => {
    it("解码十六进制数字引用 &#xHHHH;", () => {
      expect(htmlEntityDecode("&#x4F60;")).toBe("你");
    });

    it("解码十进制数字引用 &#DDDD;", () => {
      expect(htmlEntityDecode("&#20320;")).toBe("你");
    });

    it("解码命名实体 &amp; &lt; &gt; &quot; &#39;", () => {
      expect(htmlEntityDecode("&amp;")).toBe("&");
      expect(htmlEntityDecode("&lt;")).toBe("<");
      expect(htmlEntityDecode("&gt;")).toBe(">");
      expect(htmlEntityDecode("&quot;")).toBe('"');
      expect(htmlEntityDecode("&#39;")).toBe("'");
    });

    it("解码混合实体的字符串", () => {
      const result = htmlEntityDecode(
        "搜索&#x201C;&amp;&#x4F60;&#x597D;&#x201D;",
      );
      // &#x201C; = “（左弯引号）, &#x201D; = “（右弯引号）
      expect(result).toBe("搜索“&你好”");
    });

    it("不含实体的字符串原样返回", () => {
      expect(htmlEntityDecode("hello world")).toBe("hello world");
    });

    it("空字符串", () => {
      expect(htmlEntityDecode("")).toBe("");
    });
  });

  describe("htmlEntityEncode", () => {
    it("编码特殊字符为命名实体", () => {
      expect(htmlEntityEncode("<div>&</div>")).toBe(
        "&lt;div&gt;&amp;&lt;/div&gt;",
      );
    });

    it("编码引号", () => {
      expect(htmlEntityEncode('"hello"')).toBe("&quot;hello&quot;");
    });

    it("往返测试", () => {
      const original = '搜索<"你好">&copy;';
      const encoded = htmlEntityEncode(original) as string;
      const decoded = htmlEntityDecode(encoded);
      expect(decoded).toBe(original);
    });

    it("空字符串", () => {
      expect(htmlEntityEncode("")).toBe("");
    });
  });

  describe("HTML 实体非法输入", () => {
    it("decode 非字符串抛出 TypeError", () => {
      expect(() => htmlEntityDecode(123 as any)).toThrow(TypeError);
      expect(() => htmlEntityDecode(null as any)).toThrow(TypeError);
    });

    it("encode 非字符串抛出 TypeError", () => {
      expect(() => htmlEntityEncode(123 as any)).toThrow(TypeError);
      expect(() => htmlEntityEncode(null as any)).toThrow(TypeError);
    });
  });
});
