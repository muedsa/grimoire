"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  aes_decrypt: () => aes_decrypt,
  aes_encrypt: () => aes_encrypt,
  cryptoFunctions: () => cryptoFunctions,
  css_select: () => css_select,
  css_select1: () => css_select1,
  decode: () => decode2,
  decode_uri: () => decodeUri,
  decode_uri_component: () => decodeUriComponent,
  domFunctions: () => domFunctions,
  encode: () => encode2,
  encode_uri: () => encodeUri,
  encode_uri_component: () => encodeUriComponent,
  encodingFunctions: () => encodingFunctions,
  hash: () => hash,
  hmac: () => hmac,
  html_entity_decode: () => htmlEntityDecode,
  html_entity_encode: () => htmlEntityEncode,
  html_parse: () => html_parse,
  xml_parse: () => xml_parse,
  xpath_select: () => xpath_select,
  xpath_select1: () => xpath_select1
});
module.exports = __toCommonJS(index_exports);

// src/dom/parse.ts
var import_xmldom = require("@xmldom/xmldom");
var import_htmlparser2 = require("htmlparser2");
function stripNamespaces(node) {
  if ("namespaceURI" in node && node.namespaceURI) {
    node.namespaceURI = null;
  }
  if ("attributes" in node && node.attributes?.length) {
    const attrs = node.attributes;
    for (let i = 0; i < attrs.length; i++) {
      if (attrs[i]?.namespaceURI) {
        attrs[i].namespaceURI = null;
      }
    }
  }
  if ("childNodes" in node && node.childNodes?.length) {
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      if (children[i] && typeof children[i] === "object") {
        stripNamespaces(children[i]);
      }
    }
  }
}
function xml_parse(...args) {
  const xml = args[0];
  if (typeof xml !== "string") return null;
  try {
    const doc = new import_xmldom.DOMParser().parseFromString(xml, "text/html");
    stripNamespaces(doc);
    return doc;
  } catch {
    return null;
  }
}
function html_parse(...args) {
  const html = args[0];
  if (typeof html !== "string") return null;
  try {
    const doc = (0, import_htmlparser2.parseDocument)(html);
    return doc;
  } catch {
    return null;
  }
}

// src/dom/xpath.ts
var import_xpath = __toESM(require("xpath"));
function isDocument(val) {
  return val != null && typeof val === "object" && typeof val.documentElement !== "undefined";
}
function xpath_select(...args) {
  const doc = args[0];
  const expr = args[1];
  if (!isDocument(doc)) return null;
  if (typeof expr !== "string") return null;
  try {
    return import_xpath.default.select(expr, doc);
  } catch {
    return null;
  }
}
function xpath_select1(...args) {
  const doc = args[0];
  const expr = args[1];
  if (!isDocument(doc)) return null;
  if (typeof expr !== "string") return null;
  try {
    return import_xpath.default.select1(expr, doc);
  } catch {
    return null;
  }
}

// src/dom/css.ts
var import_css_select = require("css-select");
function isDomHandlerNode(val) {
  return val != null && typeof val === "object" && "type" in val && "children" in val && Array.isArray(val.children);
}
function css_select(...args) {
  const doc = args[0];
  const selector = args[1];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  try {
    return (0, import_css_select.selectAll)(
      selector,
      doc
    );
  } catch {
    return null;
  }
}
function css_select1(...args) {
  const doc = args[0];
  const selector = args[1];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  try {
    const result = (0, import_css_select.selectOne)(selector, doc);
    return result ?? null;
  } catch {
    return null;
  }
}

// src/dom/index.ts
var domFunctions = {
  xml_parse,
  html_parse,
  xpath_select,
  xpath_select1,
  css_select,
  css_select1
};

// src/encoding/index.ts
var he = __toESM(require("he"));
var VALID_ENCODINGS = [
  "utf8",
  "hex",
  "base64",
  "base64url"
];
function utf8ToBytes(str) {
  return new TextEncoder().encode(str);
}
function bytesToUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}
function hexToBytes(hex) {
  const normalized = hex.trim().toLowerCase();
  if (normalized.length % 2 !== 0) {
    throw new Error("decode: \u5341\u516D\u8FDB\u5236\u5B57\u7B26\u4E32\u957F\u5EA6\u5FC5\u987B\u4E3A\u5076\u6570");
  }
  if (!/^[0-9a-f]*$/.test(normalized)) {
    throw new Error("decode: \u5341\u516D\u8FDB\u5236\u5B57\u7B26\u4E32\u5305\u542B\u975E\u6CD5\u5B57\u7B26");
  }
  const len = normalized.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(normalized.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
function bytesToHex(bytes) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
var BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64ToBytes(b64) {
  const cleaned = b64.replace(/\s/g, "");
  const stripped = cleaned.replace(/=+$/, "");
  const fullGroups = Math.floor(stripped.length / 4) * 3;
  const remainder = stripped.length % 4;
  let extraBytes = 0;
  if (remainder === 1) throw new Error("decode: Base64 \u5B57\u7B26\u4E32\u957F\u5EA6\u65E0\u6548");
  if (remainder === 2) extraBytes = 1;
  if (remainder === 3) extraBytes = 2;
  const outLen = fullGroups + extraBytes;
  const bytes = new Uint8Array(outLen);
  let byteIdx = 0;
  for (let i = 0; i < stripped.length; i += 4) {
    const c0 = i < stripped.length ? BASE64_ALPHABET.indexOf(stripped[i]) : -1;
    const c1 = i + 1 < stripped.length ? BASE64_ALPHABET.indexOf(stripped[i + 1]) : 0;
    const c2 = i + 2 < stripped.length ? BASE64_ALPHABET.indexOf(stripped[i + 2]) : 0;
    const c3 = i + 3 < stripped.length ? BASE64_ALPHABET.indexOf(stripped[i + 3]) : 0;
    if (c0 === -1) {
      throw new Error("decode: Base64 \u5B57\u7B26\u4E32\u5305\u542B\u975E\u6CD5\u5B57\u7B26");
    }
    if (byteIdx < bytes.length) bytes[byteIdx++] = c0 << 2 | c1 >> 4;
    if (byteIdx < bytes.length) bytes[byteIdx++] = c1 << 4 | c2 >> 2;
    if (byteIdx < bytes.length) bytes[byteIdx++] = c2 << 6 | c3;
  }
  return bytes;
}
function bytesToBase64(bytes) {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += BASE64_ALPHABET[b0 >> 2];
    result += BASE64_ALPHABET[(b0 & 3) << 4 | b1 >> 4];
    if (i + 1 < bytes.length) {
      result += BASE64_ALPHABET[(b1 & 15) << 2 | b2 >> 6];
    } else {
      result += "=";
    }
    if (i + 2 < bytes.length) {
      result += BASE64_ALPHABET[b2 & 63];
    } else {
      result += "=";
    }
  }
  return result;
}
function base64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  return base64ToBytes(b64);
}
function bytesToBase64url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decode2(...args) {
  const data = args[0];
  const from = args[1];
  if (typeof data !== "string") {
    throw new TypeError("decode: \u7B2C\u4E00\u4E2A\u53C2\u6570 data \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  }
  if (typeof from !== "string" || !VALID_ENCODINGS.includes(from)) {
    throw new TypeError(
      `decode: \u7B2C\u4E8C\u4E2A\u53C2\u6570 from \u5FC5\u987B\u662F\u4EE5\u4E0B\u7F16\u7801\u4E4B\u4E00: ${VALID_ENCODINGS.join(", ")}`
    );
  }
  switch (from) {
    case "utf8":
      return utf8ToBytes(data);
    case "hex":
      return hexToBytes(data);
    case "base64":
      return base64ToBytes(data);
    case "base64url":
      return base64urlToBytes(data);
    default:
      throw new Error(`decode: \u4E0D\u652F\u6301\u7684\u7F16\u7801\u683C\u5F0F "${from}"`);
  }
}
function encode2(...args) {
  const data = args[0];
  const to = args[1];
  if (!(data instanceof Uint8Array)) {
    throw new TypeError("encode: \u7B2C\u4E00\u4E2A\u53C2\u6570 data \u5FC5\u987B\u662F Uint8Array");
  }
  if (typeof to !== "string" || !VALID_ENCODINGS.includes(to)) {
    throw new TypeError(
      `encode: \u7B2C\u4E8C\u4E2A\u53C2\u6570 to \u5FC5\u987B\u662F\u4EE5\u4E0B\u7F16\u7801\u4E4B\u4E00: ${VALID_ENCODINGS.join(", ")}`
    );
  }
  switch (to) {
    case "utf8":
      return bytesToUtf8(data);
    case "hex":
      return bytesToHex(data);
    case "base64":
      return bytesToBase64(data);
    case "base64url":
      return bytesToBase64url(data);
    default:
      throw new Error(`encode: \u4E0D\u652F\u6301\u7684\u7F16\u7801\u683C\u5F0F "${to}"`);
  }
}
function encodeUriComponent(...args) {
  const str = args[0];
  if (typeof str !== "string") {
    throw new TypeError("encode_uri_component: \u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  }
  return encodeURIComponent(str);
}
function decodeUriComponent(...args) {
  const str = args[0];
  if (typeof str !== "string") {
    throw new TypeError("decode_uri_component: \u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  }
  return decodeURIComponent(str);
}
function encodeUri(...args) {
  const str = args[0];
  if (typeof str !== "string") {
    throw new TypeError("encode_uri: \u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  }
  return encodeURI(str);
}
function decodeUri(...args) {
  const str = args[0];
  if (typeof str !== "string") {
    throw new TypeError("decode_uri: \u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  }
  return decodeURI(str);
}
function htmlEntityDecode(...args) {
  const str = args[0];
  if (typeof str !== "string") {
    throw new TypeError("html_entity_decode: \u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  }
  return he.decode(str);
}
function htmlEntityEncode(...args) {
  const str = args[0];
  if (typeof str !== "string") {
    throw new TypeError("html_entity_encode: \u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  }
  return he.encode(str, { useNamedReferences: true });
}
var encodingFunctions = {
  decode: decode2,
  encode: encode2,
  encode_uri_component: encodeUriComponent,
  decode_uri_component: decodeUriComponent,
  encode_uri: encodeUri,
  decode_uri: decodeUri,
  html_entity_decode: htmlEntityDecode,
  html_entity_encode: htmlEntityEncode
};

// src/crypto/hash.ts
var import_legacy = require("@noble/hashes/legacy.js");
var import_legacy2 = require("@noble/hashes/legacy.js");
var import_sha2 = require("@noble/hashes/sha2.js");
var import_sha22 = require("@noble/hashes/sha2.js");
var import_sha23 = require("@noble/hashes/sha2.js");
var import_hmac = require("@noble/hashes/hmac.js");
var HASH_ALGORITHMS = [
  "md5",
  "sha1",
  "sha256",
  "sha384",
  "sha512"
];
var HMAC_ALGORITHMS = ["sha256", "sha384", "sha512"];
function getHashImpl(algorithm) {
  switch (algorithm) {
    case "md5":
      return import_legacy.md5;
    case "sha1":
      return import_legacy2.sha1;
    case "sha256":
      return import_sha2.sha256;
    case "sha384":
      return import_sha22.sha384;
    case "sha512":
      return import_sha23.sha512;
    default:
      throw new Error(`hash: \u4E0D\u652F\u6301\u7684\u54C8\u5E0C\u7B97\u6CD5 "${algorithm}"`);
  }
}
function hash(...args) {
  const algorithm = args[0];
  const data = args[1];
  if (typeof algorithm !== "string" || !HASH_ALGORITHMS.includes(algorithm)) {
    throw new TypeError(
      `hash: \u7B2C\u4E00\u4E2A\u53C2\u6570 algorithm \u5FC5\u987B\u662F\u4EE5\u4E0B\u4E4B\u4E00: ${HASH_ALGORITHMS.join(", ")}`
    );
  }
  if (!(data instanceof Uint8Array)) {
    throw new TypeError("hash: \u7B2C\u4E8C\u4E2A\u53C2\u6570 data \u5FC5\u987B\u662F Uint8Array");
  }
  const impl = getHashImpl(algorithm);
  return impl(data);
}
function hmac(...args) {
  const algorithm = args[0];
  const data = args[1];
  const key = args[2];
  if (typeof algorithm !== "string" || !HMAC_ALGORITHMS.includes(algorithm)) {
    throw new TypeError(
      `hmac: \u7B2C\u4E00\u4E2A\u53C2\u6570 algorithm \u5FC5\u987B\u662F\u4EE5\u4E0B\u4E4B\u4E00: ${HMAC_ALGORITHMS.join(", ")}`
    );
  }
  if (!(data instanceof Uint8Array)) {
    throw new TypeError("hmac: \u7B2C\u4E8C\u4E2A\u53C2\u6570 data \u5FC5\u987B\u662F Uint8Array");
  }
  if (!(key instanceof Uint8Array)) {
    throw new TypeError("hmac: \u7B2C\u4E09\u4E2A\u53C2\u6570 key \u5FC5\u987B\u662F Uint8Array");
  }
  const hashImpl = getHashImpl(algorithm);
  return (0, import_hmac.hmac)(hashImpl, key, data);
}

// src/crypto/aes.ts
var import_aes = require("@noble/ciphers/aes.js");
var import_aes2 = require("@noble/ciphers/aes.js");
var import_aes3 = require("@noble/ciphers/aes.js");
var import_aes4 = require("@noble/ciphers/aes.js");
var AES_ALGORITHMS = [
  "aes-128-cbc",
  "aes-256-cbc",
  "aes-128-gcm",
  "aes-256-gcm",
  "aes-128-ctr",
  "aes-256-ctr"
];
var PADDING_MODES = ["pkcs7", "zero", "none"];
var AES_BLOCK_SIZE = 16;
var GCM_IV_SIZE = 12;
function getKeySize(algorithm) {
  return algorithm.includes("128") ? 16 : 32;
}
function validateSizes(algorithm, key, iv) {
  const expectedKeySize = getKeySize(algorithm);
  if (key.length !== expectedKeySize) {
    throw new Error(
      `aes: \u5BC6\u94A5\u957F\u5EA6\u5E94\u4E3A ${expectedKeySize} \u5B57\u8282 (${algorithm})\uFF0C\u5B9E\u9645\u4E3A ${key.length} \u5B57\u8282`
    );
  }
  if (algorithm.includes("gcm")) {
    if (iv.length !== GCM_IV_SIZE) {
      throw new Error(
        `aes: GCM \u6A21\u5F0F IV \u957F\u5EA6\u5E94\u4E3A ${GCM_IV_SIZE} \u5B57\u8282\uFF0C\u5B9E\u9645\u4E3A ${iv.length} \u5B57\u8282`
      );
    }
  } else {
    if (iv.length !== AES_BLOCK_SIZE) {
      throw new Error(
        `aes: IV \u957F\u5EA6\u5E94\u4E3A ${AES_BLOCK_SIZE} \u5B57\u8282\uFF0C\u5B9E\u9645\u4E3A ${iv.length} \u5B57\u8282`
      );
    }
  }
}
function pkcs7Pad(data) {
  const padLen = AES_BLOCK_SIZE - data.length % AES_BLOCK_SIZE;
  const padded = new Uint8Array(data.length + padLen);
  padded.set(data);
  padded.fill(padLen, data.length);
  return padded;
}
function pkcs7Unpad(data) {
  if (data.length === 0) throw new Error("aes: \u89E3\u5BC6\u6570\u636E\u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u53BB\u9664\u586B\u5145");
  if (data.length % AES_BLOCK_SIZE !== 0) {
    throw new Error("aes: \u89E3\u5BC6\u6570\u636E\u957F\u5EA6\u4E0D\u662F\u5757\u5927\u5C0F\u7684\u6574\u6570\u500D");
  }
  const padLen = data[data.length - 1];
  if (padLen < 1 || padLen > AES_BLOCK_SIZE) {
    throw new Error(`aes: PKCS#7 \u586B\u5145\u503C\u5F02\u5E38: ${padLen}`);
  }
  for (let i = data.length - padLen; i < data.length; i++) {
    if (data[i] !== padLen) {
      throw new Error("aes: PKCS#7 \u586B\u5145\u6821\u9A8C\u5931\u8D25");
    }
  }
  return data.slice(0, data.length - padLen);
}
function zeroPad(data) {
  const padLen = AES_BLOCK_SIZE - data.length % AES_BLOCK_SIZE;
  if (padLen === AES_BLOCK_SIZE) return data;
  const padded = new Uint8Array(data.length + padLen);
  padded.set(data);
  return padded;
}
function zeroUnpad(data) {
  if (data.length === 0) throw new Error("aes: \u89E3\u5BC6\u6570\u636E\u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u53BB\u9664\u586B\u5145");
  let end = data.length;
  while (end > 0 && data[end - 1] === 0) {
    end--;
  }
  if (end === 0) {
    throw new Error("aes: Zero \u586B\u5145\u53BB\u9664\u540E\u6570\u636E\u4E3A\u7A7A");
  }
  return data.slice(0, end);
}
function applyPadding(data, mode) {
  switch (mode) {
    case "pkcs7":
      return pkcs7Pad(data);
    case "zero":
      return zeroPad(data);
    case "none":
      if (data.length % AES_BLOCK_SIZE !== 0) {
        throw new Error(
          `aes: \u4F7F\u7528 "none" \u586B\u5145\u6A21\u5F0F\u65F6\uFF0C\u660E\u6587\u957F\u5EA6\u5FC5\u987B\u662F ${AES_BLOCK_SIZE} \u7684\u6574\u6570\u500D\uFF0C\u5F53\u524D ${data.length} \u5B57\u8282`
        );
      }
      return data;
    default:
      throw new Error(`aes: \u4E0D\u652F\u6301\u7684\u586B\u5145\u6A21\u5F0F "${mode}"`);
  }
}
function removePadding(data, mode) {
  switch (mode) {
    case "pkcs7":
      return pkcs7Unpad(data);
    case "zero":
      return zeroUnpad(data);
    case "none":
      return data;
    default:
      throw new Error(`aes: \u4E0D\u652F\u6301\u7684\u586B\u5145\u6A21\u5F0F "${mode}"`);
  }
}
function rawCbcEncrypt(key, iv, data) {
  const expandedKey = import_aes4.unsafe.expandKeyLE(key);
  const result = new Uint8Array(data.length);
  let prev = new Uint8Array(iv);
  for (let i = 0; i < data.length; i += AES_BLOCK_SIZE) {
    const input = new Uint8Array(AES_BLOCK_SIZE);
    for (let j = 0; j < AES_BLOCK_SIZE; j++) {
      input[j] = data[i + j] ^ prev[j];
    }
    const cipherBlock = import_aes4.unsafe.encryptBlock(expandedKey, input);
    prev = new Uint8Array(
      cipherBlock.buffer.slice(
        cipherBlock.byteOffset,
        cipherBlock.byteOffset + AES_BLOCK_SIZE
      )
    );
    result.set(prev, i);
  }
  return result;
}
function rawCbcDecrypt(key, iv, data) {
  const expandedKey = import_aes4.unsafe.expandKeyDecLE(key);
  const result = new Uint8Array(data.length);
  let prev = new Uint8Array(iv);
  for (let i = 0; i < data.length; i += AES_BLOCK_SIZE) {
    const cipherForDecrypt = data.slice(i, i + AES_BLOCK_SIZE);
    const cipherForPrev = new Uint8Array(cipherForDecrypt);
    const decrypted = import_aes4.unsafe.decryptBlock(expandedKey, cipherForDecrypt);
    for (let j = 0; j < AES_BLOCK_SIZE; j++) {
      result[i + j] = decrypted[j] ^ prev[j];
    }
    prev = cipherForPrev;
  }
  return result;
}
function aes_encrypt(...args) {
  const algorithm = args[0];
  const data = args[1];
  const key = args[2];
  const iv = args[3];
  const rawPadding = args[4];
  if (typeof algorithm !== "string" || !AES_ALGORITHMS.includes(algorithm)) {
    throw new TypeError(
      `aes_encrypt: \u7B2C\u4E00\u4E2A\u53C2\u6570 algorithm \u5FC5\u987B\u662F\u4EE5\u4E0B\u4E4B\u4E00: ${AES_ALGORITHMS.join(", ")}`
    );
  }
  if (!(data instanceof Uint8Array)) {
    throw new TypeError("aes_encrypt: \u7B2C\u4E8C\u4E2A\u53C2\u6570 data \u5FC5\u987B\u662F Uint8Array");
  }
  if (!(key instanceof Uint8Array)) {
    throw new TypeError("aes_encrypt: \u7B2C\u4E09\u4E2A\u53C2\u6570 key \u5FC5\u987B\u662F Uint8Array");
  }
  if (!(iv instanceof Uint8Array)) {
    throw new TypeError("aes_encrypt: \u7B2C\u56DB\u4E2A\u53C2\u6570 iv \u5FC5\u987B\u662F Uint8Array");
  }
  const algo = algorithm;
  const isCbc = algo.includes("cbc");
  const isGcm = algo.includes("gcm");
  const isCtr = algo.includes("ctr");
  let padding = "pkcs7";
  if (isCbc && rawPadding !== void 0) {
    if (typeof rawPadding !== "string" || !PADDING_MODES.includes(rawPadding)) {
      throw new TypeError(
        `aes_encrypt: padding \u5FC5\u987B\u662F\u4EE5\u4E0B\u4E4B\u4E00: ${PADDING_MODES.join(", ")}`
      );
    }
    padding = rawPadding;
  }
  validateSizes(algo, key, iv);
  try {
    if (isCbc && padding !== "pkcs7") {
      const padded = applyPadding(data, padding);
      return rawCbcEncrypt(key, iv, padded);
    }
    if (isCbc) {
      return (0, import_aes.cbc)(key, iv).encrypt(data);
    }
    if (isGcm) {
      return (0, import_aes2.gcm)(key, iv).encrypt(data);
    }
    return (0, import_aes3.ctr)(key, iv).encrypt(data);
  } catch (e) {
    throw new Error(`aes_encrypt: \u52A0\u5BC6\u5931\u8D25 \u2014 ${e.message}`);
  }
}
function aes_decrypt(...args) {
  const algorithm = args[0];
  const data = args[1];
  const key = args[2];
  const iv = args[3];
  const rawPadding = args[4];
  if (typeof algorithm !== "string" || !AES_ALGORITHMS.includes(algorithm)) {
    throw new TypeError(
      `aes_decrypt: \u7B2C\u4E00\u4E2A\u53C2\u6570 algorithm \u5FC5\u987B\u662F\u4EE5\u4E0B\u4E4B\u4E00: ${AES_ALGORITHMS.join(", ")}`
    );
  }
  if (!(data instanceof Uint8Array)) {
    throw new TypeError("aes_decrypt: \u7B2C\u4E8C\u4E2A\u53C2\u6570 data \u5FC5\u987B\u662F Uint8Array");
  }
  if (!(key instanceof Uint8Array)) {
    throw new TypeError("aes_decrypt: \u7B2C\u4E09\u4E2A\u53C2\u6570 key \u5FC5\u987B\u662F Uint8Array");
  }
  if (!(iv instanceof Uint8Array)) {
    throw new TypeError("aes_decrypt: \u7B2C\u56DB\u4E2A\u53C2\u6570 iv \u5FC5\u987B\u662F Uint8Array");
  }
  const algo = algorithm;
  const isCbc = algo.includes("cbc");
  const isGcm = algo.includes("gcm");
  const isCtr = algo.includes("ctr");
  let padding = "pkcs7";
  if (isCbc && rawPadding !== void 0) {
    if (typeof rawPadding !== "string" || !PADDING_MODES.includes(rawPadding)) {
      throw new TypeError(
        `aes_decrypt: padding \u5FC5\u987B\u662F\u4EE5\u4E0B\u4E4B\u4E00: ${PADDING_MODES.join(", ")}`
      );
    }
    padding = rawPadding;
  }
  validateSizes(algo, key, iv);
  try {
    if (isCbc && padding !== "pkcs7") {
      const raw = rawCbcDecrypt(key, iv, data);
      return removePadding(raw, padding);
    }
    if (isCbc) {
      return (0, import_aes.cbc)(key, iv).decrypt(data);
    }
    if (isGcm) {
      return (0, import_aes2.gcm)(key, iv).decrypt(data);
    }
    return (0, import_aes3.ctr)(key, iv).decrypt(data);
  } catch (e) {
    throw new Error(`aes_decrypt: \u89E3\u5BC6\u5931\u8D25 \u2014 ${e.message}`);
  }
}

// src/crypto/index.ts
var cryptoFunctions = {
  hash,
  hmac,
  aes_encrypt,
  aes_decrypt
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  aes_decrypt,
  aes_encrypt,
  cryptoFunctions,
  css_select,
  css_select1,
  decode,
  decode_uri,
  decode_uri_component,
  domFunctions,
  encode,
  encode_uri,
  encode_uri_component,
  encodingFunctions,
  hash,
  hmac,
  html_entity_decode,
  html_entity_encode,
  html_parse,
  xml_parse,
  xpath_select,
  xpath_select1
});
//# sourceMappingURL=index.cjs.map