/**
 * 将 AssignTemplate 值转为简短可读字符串，用于节点预览和编辑器摘要
 */
export type AssignTemplate =
  | string | number | boolean | null
  | AssignTemplate[]
  | { [key: string]: AssignTemplate };

/**
 * 将 AssignTemplate 转为简短可读字符串
 * - 字符串: 直接显示（截断到 maxLen 字符）
 * - 数字/布尔/null: 转为字符串
 * - 数组: [item1, item2] 取前 3 项摘要
 * - 对象: {key1, key2: val} 取前 3 个键值
 */
export function templateSummary(
  template: AssignTemplate | undefined,
  maxLen = 40
): string {
  if (template === undefined) return '...';
  if (template === null) return 'null';

  switch (typeof template) {
    case 'string':
      return template.length > maxLen
        ? template.slice(0, maxLen) + '...'
        : template;
    case 'number':
      return String(template);
    case 'boolean':
      return template ? 'true' : 'false';
    case 'object':
      if (Array.isArray(template)) {
        return summarizeArray(template, maxLen);
      }
      return summarizeObject(template, maxLen);
    default:
      return '...';
  }
}

function summarizeArray(arr: AssignTemplate[], maxLen: number): string {
  if (arr.length === 0) return '[]';
  const limit = 3;
  const items = arr.slice(0, limit).map((item) => templateSummary(item, Math.max(maxLen / limit, 8)));
  const rest = arr.length > limit ? ', ...' : '';
  const inner = items.join(', ') + rest;
  return `[${inner}]`;
}

function summarizeObject(obj: Record<string, AssignTemplate>, maxLen: number): string {
  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';
  const limit = 3;
  const parts: string[] = [];
  for (const key of keys.slice(0, limit)) {
    const val = obj[key];
    if (val === null || val === undefined) {
      parts.push(key);
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      parts.push(key);
    } else if (Array.isArray(val)) {
      parts.push(val.length === 0 ? `${key}: []` : `${key}: [...]`);
    } else {
      parts.push(`${key}: ${templateSummary(val, Math.max(maxLen / limit, 6))}`);
    }
  }
  if (keys.length > limit) parts.push('...');
  return `{${parts.join(', ')}}`;
}
