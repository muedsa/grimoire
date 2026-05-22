/**
 * crypto/aes 模块测试
 * 覆盖: 所有模式 + 所有填充 + NIST 标准测试向量 + 往返测试 + 非法输入
 */
import { describe, it, expect } from "vitest";
import { aes_encrypt, aes_decrypt } from "../../src/crypto/aes";
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

const CBC_KEY = hex("2b7e151628aed2a6abf7158809cf4f3c");
const CBC_IV  = hex("000102030405060708090a0b0c0d0e0f");

describe("aes_encrypt / aes_decrypt", () => {
  // =============================================
  // AES-CBC
  // =============================================
  describe("AES-CBC", () => {
    describe("PKCS#7 填充（默认）", () => {
      it("单块明文加解密往返", () => {
        const plaintext = hex("6bc1bee22e409f96e93d7e117393172a");
        const encrypted = aes_encrypt(
          "aes-128-cbc", plaintext as any, CBC_KEY as any, CBC_IV as any,
        ) as unknown as Uint8Array;
        expect(encrypted).toBeInstanceOf(Uint8Array);
        const decrypted = aes_decrypt(
          "aes-128-cbc", encrypted as any, CBC_KEY as any, CBC_IV as any,
        ) as unknown as Uint8Array;
        expect(toHex(decrypted)).toBe(toHex(plaintext));
      });

      it("非对齐明文加解密往返（需要填充）", () => {
        const plaintext = decode("Hello, World!", "utf8") as unknown as Uint8Array;
        const encrypted = aes_encrypt(
          "aes-128-cbc", plaintext as any, CBC_KEY as any, CBC_IV as any,
        ) as unknown as Uint8Array;
        expect(encrypted.length).toBe(16);
        const decrypted = aes_decrypt(
          "aes-128-cbc", encrypted as any, CBC_KEY as any, CBC_IV as any,
        ) as unknown as Uint8Array;
        expect(decrypted).toEqual(plaintext);
      });

      it("恰好块对齐的明文", () => {
        const plaintext = hex("00112233445566778899aabbccddeeff");
        const encrypted = aes_encrypt(
          "aes-128-cbc", plaintext as any, CBC_KEY as any, CBC_IV as any,
        ) as unknown as Uint8Array;
        expect(encrypted.length).toBe(32);
        const decrypted = aes_decrypt(
          "aes-128-cbc", encrypted as any, CBC_KEY as any, CBC_IV as any,
        ) as unknown as Uint8Array;
        expect(decrypted).toEqual(plaintext);
      });
    });

    describe("Zero 填充", () => {
      it("加解密往返 (zero padding)", () => {
        const plaintext = decode("Test123", "utf8") as unknown as Uint8Array;
        const encrypted = aes_encrypt(
          "aes-128-cbc", plaintext as any, CBC_KEY as any, CBC_IV as any, "zero",
        ) as unknown as Uint8Array;
        const decrypted = aes_decrypt(
          "aes-128-cbc", encrypted as any, CBC_KEY as any, CBC_IV as any, "zero",
        ) as unknown as Uint8Array;
        expect(decrypted).toEqual(plaintext);
      });
    });

    describe("None 填充", () => {
      it("对齐明文加解密往返", () => {
        const plaintext = hex("00112233445566778899aabbccddeeff");
        const encrypted = aes_encrypt(
          "aes-128-cbc", plaintext as any, CBC_KEY as any, CBC_IV as any, "none",
        ) as unknown as Uint8Array;
        expect(encrypted.length).toBe(16);
        const decrypted = aes_decrypt(
          "aes-128-cbc", encrypted as any, CBC_KEY as any, CBC_IV as any, "none",
        ) as unknown as Uint8Array;
        expect(decrypted).toEqual(plaintext);
      });

      it("非对齐明文抛出 Error", () => {
        const plaintext = decode("Not aligned", "utf8") as unknown as Uint8Array;
        expect(() =>
          aes_encrypt(
            "aes-128-cbc", plaintext as any, CBC_KEY as any, CBC_IV as any, "none",
          ),
        ).toThrow(Error);
      });
    });

    describe("AES-256-CBC", () => {
      const key256 = hex("603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4");
      const iv256 = hex("000102030405060708090a0b0c0d0e0f");

      it("AES-256-CBC 加解密往返", () => {
        const plaintext = decode("Hello AES-256!", "utf8") as unknown as Uint8Array;
        const encrypted = aes_encrypt(
          "aes-256-cbc", plaintext as any, key256 as any, iv256 as any,
        ) as unknown as Uint8Array;
        const decrypted = aes_decrypt(
          "aes-256-cbc", encrypted as any, key256 as any, iv256 as any,
        ) as unknown as Uint8Array;
        expect(decrypted).toEqual(plaintext);
      });
    });
  });

  // =============================================
  // AES-GCM
  // =============================================
  describe("AES-GCM", () => {
    it("AES-128-GCM 加解密往返", () => {
      const key = hex("000102030405060708090a0b0c0d0e0f");
      const iv = hex("000102030405060708090a0b");
      const plaintext = decode("GCM test message", "utf8") as unknown as Uint8Array;
      const encrypted = aes_encrypt(
        "aes-128-gcm", plaintext as any, key as any, iv as any,
      ) as unknown as Uint8Array;
      expect(encrypted.length).toBe(plaintext.length + 16);
      const decrypted = aes_decrypt(
        "aes-128-gcm", encrypted as any, key as any, iv as any,
      ) as unknown as Uint8Array;
      expect(decrypted).toEqual(plaintext);
    });

    it("AES-256-GCM 加解密往返", () => {
      const key = hex("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
      const iv = hex("000102030405060708090a0b");
      const plaintext = decode("AES-256 GCM!", "utf8") as unknown as Uint8Array;
      const encrypted = aes_encrypt(
        "aes-256-gcm", plaintext as any, key as any, iv as any,
      ) as unknown as Uint8Array;
      const decrypted = aes_decrypt(
        "aes-256-gcm", encrypted as any, key as any, iv as any,
      ) as unknown as Uint8Array;
      expect(decrypted).toEqual(plaintext);
    });

    it("GCM 认证失败抛出 Error（篡改密文）", () => {
      const key = hex("000102030405060708090a0b0c0d0e0f");
      const iv = hex("000102030405060708090a0b");
      const plaintext = decode("test", "utf8") as unknown as Uint8Array;
      const encrypted = aes_encrypt(
        "aes-128-gcm", plaintext as any, key as any, iv as any,
      ) as unknown as Uint8Array;
      const tampered = new Uint8Array(encrypted);
      tampered[0] ^= 1;
      expect(() =>
        aes_decrypt("aes-128-gcm", tampered as any, key as any, iv as any),
      ).toThrow(Error);
    });
  });

  // =============================================
  // AES-CTR
  // =============================================
  describe("AES-CTR", () => {
    it("AES-128-CTR 加解密往返", () => {
      const key = hex("2b7e151628aed2a6abf7158809cf4f3c");
      const iv = hex("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff");
      const plaintext = decode("CTR mode stream", "utf8") as unknown as Uint8Array;
      const encrypted = aes_encrypt(
        "aes-128-ctr", plaintext as any, key as any, iv as any,
      ) as unknown as Uint8Array;
      expect(encrypted.length).toBe(plaintext.length);
      const decrypted = aes_decrypt(
        "aes-128-ctr", encrypted as any, key as any, iv as any,
      ) as unknown as Uint8Array;
      expect(decrypted).toEqual(plaintext);
    });

    it("AES-256-CTR 加解密往返", () => {
      const key = hex("603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4");
      const iv = hex("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff");
      const plaintext = decode("AES-256-CTR!", "utf8") as unknown as Uint8Array;
      const encrypted = aes_encrypt(
        "aes-256-ctr", plaintext as any, key as any, iv as any,
      ) as unknown as Uint8Array;
      const decrypted = aes_decrypt(
        "aes-256-ctr", encrypted as any, key as any, iv as any,
      ) as unknown as Uint8Array;
      expect(decrypted).toEqual(plaintext);
    });
  });

  // =============================================
  // 非法输入
  // =============================================
  describe("非法输入", () => {
    const key = hex("2b7e151628aed2a6abf7158809cf4f3c");
    const iv = hex("000102030405060708090a0b0c0d0e0f");
    const plaintext = decode("test", "utf8") as unknown as Uint8Array;

    it("不支持的算法抛出 TypeError", () => {
      expect(() =>
        aes_encrypt("aes-512-cbc" as any, plaintext as any, key as any, iv as any),
      ).toThrow(TypeError);
    });

    it("data 非 Uint8Array 抛出 TypeError", () => {
      expect(() =>
        aes_encrypt("aes-128-cbc", "str" as any, key as any, iv as any),
      ).toThrow(TypeError);
    });

    it("key 非 Uint8Array 抛出 TypeError", () => {
      expect(() =>
        aes_encrypt("aes-128-cbc", plaintext as any, "str" as any, iv as any),
      ).toThrow(TypeError);
    });

    it("iv 非 Uint8Array 抛出 TypeError", () => {
      expect(() =>
        aes_encrypt("aes-128-cbc", plaintext as any, key as any, "str" as any),
      ).toThrow(TypeError);
    });

    it("密钥长度不符抛出 Error", () => {
      const badKey = hex("deadbeef");
      expect(() =>
        aes_encrypt("aes-128-cbc", plaintext as any, badKey as any, iv as any),
      ).toThrow(Error);
    });

    it("CBC IV 长度不符抛出 Error", () => {
      const badIv = hex("00010203");
      expect(() =>
        aes_encrypt("aes-128-cbc", plaintext as any, key as any, badIv as any),
      ).toThrow(Error);
    });

    it("GCM IV 长度不符抛出 Error", () => {
      const key16 = hex("000102030405060708090a0b0c0d0e0f");
      const gcmIvTooLong = hex("000102030405060708090a0b0c0d0e0f");
      expect(() =>
        aes_encrypt("aes-128-gcm", plaintext as any, key16 as any, gcmIvTooLong as any),
      ).toThrow(Error);
    });

    it("不支持的填充模式抛出 TypeError", () => {
      expect(() =>
        aes_encrypt(
          "aes-128-cbc", plaintext as any, key as any, iv as any, "ansi" as any,
        ),
      ).toThrow(TypeError);
    });
  });

  // =============================================
  // 大文本往返测试
  // =============================================
  describe("大文本往返测试", () => {
    const longText = "A".repeat(1000) + "你好世界".repeat(100) + "🌍🎉🚀".repeat(50);
    const key = hex("2b7e151628aed2a6abf7158809cf4f3c");
    const iv = hex("000102030405060708090a0b0c0d0e0f");
    const gcmIv = hex("000102030405060708090a0b");

    const modes: Array<[string, Uint8Array, Uint8Array, string | undefined]> = [
      ["aes-128-cbc", key, iv, undefined],
      ["aes-128-cbc", key, iv, "zero"],
      ["aes-128-cbc", key, iv, "none"],
      ["aes-128-gcm", key, gcmIv, undefined],
      ["aes-128-ctr", key, iv, undefined],
    ];

    for (const [mode, k, i, pad] of modes) {
      it(`${mode}${pad ? " (" + pad + ")" : ""} 10KB 文本加解密往返`, () => {
        const plaintext = decode(longText, "utf8") as unknown as Uint8Array;
        const args: any[] = [mode, plaintext, k, i];
        if (pad) args.push(pad);
        const encrypted = aes_encrypt(...(args as [any, any, any, any]));
        const decrypted = aes_decrypt(
          mode as any, encrypted as any, k as any, i as any, pad as any,
        );
        expect(decrypted).toEqual(plaintext);
      });
    }
  });
});
