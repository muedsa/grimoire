import { AssignTemplate } from "../types/rule";
import { evaluateExpression, CustomFunction } from "../expression/evaluator";
import { ExecutionContext } from "../context/context";
import { AllowedValue } from "../types/node";
import { Logger } from "../logger";

type TemplatePart =
  | { type: "literal"; value: string }
  | { type: "expr"; value: string };

/** 模板解析缓存 — 相同模板字符串只解析一次 */
const templateCache = new Map<string, TemplatePart[]>();

/**
 * 解析模板字符串中的 ${expr} 片段（带缓存）
 */
function parseTemplate(input: string): TemplatePart[] {
  const cached = templateCache.get(input);
  if (cached) return cached;

  const parts: TemplatePart[] = [];
  const regex = /\$\{([^}]*)\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "literal", value: input.slice(lastIndex, match.index) });
    }
    parts.push({ type: "expr", value: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    parts.push({ type: "literal", value: input.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: "literal", value: input });
  }

  templateCache.set(input, parts);
  return parts;
}

/**
 * 求值模板字符串
 * - 无 ${} → 返回原始字符串
 * - 仅一个 ${expr} 且无其他文本 → 返回表达式求值结果
 * - 混合文本或多个 ${} → 拼接为字符串
 */
async function evaluateTemplate(
  input: string,
  ctx: ExecutionContext,
  logger?: Logger,
  customFunctions?: Record<string, CustomFunction>,
): Promise<AllowedValue> {
  const parts = parseTemplate(input);

  if (parts.length === 1 && parts[0].type === "literal") {
    return parts[0].value;
  }

  if (parts.length === 1 && parts[0].type === "expr") {
    return await evaluateExpression(parts[0].value, ctx, logger, customFunctions);
  }

  let result = "";
  for (const part of parts) {
    if (part.type === "literal") {
      result += part.value;
    } else {
      const value = await evaluateExpression(part.value, ctx, logger, customFunctions);
      result += String(value ?? "");
    }
  }
  return result;
}

/**
 * 递归求值 AssignTemplate 结构
 */
export async function evaluateAssign(
  template: AssignTemplate,
  ctx: ExecutionContext,
  logger?: Logger,
  customFunctions?: Record<string, CustomFunction>,
): Promise<AllowedValue> {
  if (template === null) {
    return null;
  }

  if (typeof template === "string") {
    return await evaluateTemplate(template, ctx, logger, customFunctions);
  }

  if (typeof template === "number" || typeof template === "boolean") {
    return template;
  }

  if (Array.isArray(template)) {
    return await Promise.all(
      template.map((item) => evaluateAssign(item, ctx, logger, customFunctions)),
    ) as AllowedValue[];
  }

  if (typeof template === "object") {
    const result: Record<string, AllowedValue> = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = await evaluateAssign(value, ctx, logger, customFunctions);
    }
    return result as AllowedValue;
  }

  return template;
}
