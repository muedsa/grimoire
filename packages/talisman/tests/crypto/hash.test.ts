/**
 * crypto/hash 模块测试
 * 覆盖: hash/hmac 所有算法 + 标准测试向量 + 非法输入
 */
import { describe, it, expect } from "vitest";
import { hash, hmac } from "../../src/crypto/hash";
import { decode } from "../../src/encoding";

/** 辅助: hex 字符串 → Uint8Array */
function hex(hexStr: string): Uint8Array {
  return decode(hexStr, "hex") as unknown as Uint8Array;
}

/** 辅助: Uint8Array → hex 字符串 */
function toHex(bytes: unknown): string {
  if (!(bytes instanceof Uint8Array)) throw new Error("not Uint8Array");
  let h = "";
  for (let i = 0; i < bytes.length; i++) {
    h += bytes[i].toString(16).padStart(2, "0");
  }
  return h;
}

// ---- hash 测试 ----

describe("hash", () => {
  describe("标准测试向量", () => {
    it("MD5 空字符串", () => {
      const result = hash("md5", decode("", "utf8") as any);
      expect(toHex(result)).toBe("d41d8cd98f00b204e9800998ecf8427e");
    });

    it("SHA1 空字符串", () => {
      const result = hash("sha1", decode("", "utf8") as any);
      expect(toHex(result)).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
    });

    it('SHA256 "abc"', () => {
      const result = hash("sha256", decode("abc", "utf8") as any);
      expect(toHex(result)).toBe(
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      );
    });

    it("SHA256 空字符串", () => {
      const result = hash("sha256", decode("", "utf8") as any);
      expect(toHex(result)).toBe(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      );
    });

    it("SHA384 空字符串", () => {
      const result = hash("sha384", decode("", "utf8") as any);
      expect(toHex(result)).toBe(
        "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b",
      );
    });

    it("SHA512 空字符串", () => {
      const result = hash("sha512", decode("", "utf8") as any);
      expect(toHex(result)).toBe(
        "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
      );
    });
  });

  describe("基本功能", () => {
    it("hash 返回 Uint8Array", () => {
      const result = hash("sha256", decode("hello", "utf8") as any);
      expect(result).toBeInstanceOf(Uint8Array);
      expect((result as unknown as Uint8Array).length).toBe(32);
    });

    it("相同输入产生相同哈希", () => {
      const a = toHex(hash("sha256", decode("test", "utf8") as any));
      const b = toHex(hash("sha256", decode("test", "utf8") as any));
      expect(a).toBe(b);
    });

    it("不同算法产生不同输出", () => {
      const data = decode("hello", "utf8") as any;
      const md5Hex = toHex(hash("md5", data));
      const sha256Hex = toHex(hash("sha256", data));
      expect(md5Hex).not.toBe(sha256Hex);
    });
  });

  describe("非法输入", () => {
    it("不支持的算法抛出 TypeError", () => {
      expect(() => hash("ripemd160" as any, decode("hi", "utf8") as any)).toThrow(TypeError);
    });

    it("algorithm 非字符串抛出 TypeError", () => {
      expect(() => hash(123 as any, decode("hi", "utf8") as any)).toThrow(TypeError);
    });

    it("data 非 Uint8Array 抛出 TypeError", () => {
      expect(() => hash("sha256", "not-bytes" as any)).toThrow(TypeError);
      expect(() => hash("sha256", 123 as any)).toThrow(TypeError);
      expect(() => hash("sha256", null as any)).toThrow(TypeError);
    });
  });
});

// ---- HMAC 测试 ----

describe("hmac", () => {
  describe("标准测试向量 (RFC 4231)", () => {
    it("HMAC-SHA256 Test Case 1", () => {
      const key = hex("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b");
      const data = decode("Hi There", "utf8") as unknown as Uint8Array;
      const result = hmac("sha256", data as any, key as any);
      expect(toHex(result)).toBe(
        "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
      );
    });

    it("HMAC-SHA256 Test Case 2", () => {
      const key = decode("Jefe", "utf8") as unknown as Uint8Array;
      const data = decode("what do ya want for nothing?", "utf8") as unknown as Uint8Array;
      const result = hmac("sha256", data as any, key as any);
      expect(toHex(result)).toBe(
        "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
      );
    });
  });

  describe("基本功能", () => {
    it("hmac 返回 Uint8Array", () => {
      const key = decode("secret", "utf8") as any;
      const data = decode("message", "utf8") as any;
      const result = hmac("sha256", data, key);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("相同输入产生相同 MAC", () => {
      const key = decode("key", "utf8") as any;
      const data = decode("data", "utf8") as any;
      expect(toHex(hmac("sha256", data, key))).toBe(toHex(hmac("sha256", data, key)));
    });

    it("不同 key 产生不同 MAC", () => {
      const data = decode("data", "utf8") as any;
      const k1 = decode("key1", "utf8") as any;
      const k2 = decode("key2", "utf8") as any;
      expect(toHex(hmac("sha256", data, k1))).not.toBe(toHex(hmac("sha256", data, k2)));
    });
  });

  describe("非法输入", () => {
    const data = decode("test", "utf8") as any;
    const key = decode("key", "utf8") as any;

    it("不支持的算法抛出 TypeError", () => {
      expect(() => hmac("md5" as any, data, key)).toThrow(TypeError);
      expect(() => hmac("sha1" as any, data, key)).toThrow(TypeError);
    });

    it("algorithm 非字符串抛出 TypeError", () => {
      expect(() => hmac(123 as any, data, key)).toThrow(TypeError);
    });

    it("data 非 Uint8Array 抛出 TypeError", () => {
      expect(() => hmac("sha256", "str" as any, key)).toThrow(TypeError);
    });

    it("key 非 Uint8Array 抛出 TypeError", () => {
      expect(() => hmac("sha256", data, "str" as any)).toThrow(TypeError);
    });
  });
});
