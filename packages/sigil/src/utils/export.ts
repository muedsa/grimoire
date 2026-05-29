import {
  RuleDefinition,
  RuleNode,
  AllowedValue,
  AssignTemplate,
} from "@grimoire/rune";
import { useFlowStore, SigilNode, START_NODE_ID } from "../store/flow";

/** 邻接表条目类型 */
type ChildEntry = { targetId: string; handle: string };

/** 最近一次导出时，RuleNode 的执行顺序对应的 flow nodeId 列表 */
let lastExportOrder: string[] = [];

/** 获取最近一次导出的节点顺序（flow node IDs） */
export function getLastExportedNodeOrder(): string[] {
  return [...lastExportOrder];
}

/** 将 Flow 的节点和边转换为 rune RuleDefinition */
export function exportToRuleDefinition(): RuleDefinition {
  const { nodes, edges } = useFlowStore.getState();
  lastExportOrder = [];

  // 构建邻接表: nodeId -> [{ targetId, handle }]
  const childrenMap = new Map<string, ChildEntry[]>();
  for (const edge of edges) {
    const handle = edge.sourceHandle ?? "out";
    const list = childrenMap.get(edge.source) ?? [];
    list.push({ targetId: edge.target, handle });
    childrenMap.set(edge.source, list);
  }

  // 从起始节点获取初始变量（直接映射为 AllowedValue）
  const startNode = nodes.find((n) => n.id === START_NODE_ID);
  const startConfig = startNode?.data.config as
    | Record<string, unknown>
    | undefined;
  const startVars = startConfig?.variables as AllowedValue | undefined;
  const variables: Record<string, AllowedValue> =
    typeof startVars === "object" && startVars !== null
      ? (startVars as Record<string, AllowedValue>)
      : {};

  // 从起始节点开始，获取其直接连接的第一批节点
  const startChildren = childrenMap.get(START_NODE_ID) ?? [];
  const entryIds = startChildren.map((c) => c.targetId);

  // 如果没有任何连接，返回空的 main
  const ruleNodes: Record<string, RuleNode[]> = {};
  if (entryIds.length === 0) {
    ruleNodes.main = [];
    return {
      name: "sigil-exported",
      entry: "main",
      variables,
      nodes: ruleNodes,
    };
  }

  const entries: RuleNode[] = entryIds
    .map((id) =>
      collectLinearChain(id, nodes, childrenMap, new Set([START_NODE_ID])),
    )
    .flat()
    .filter((n): n is RuleNode => n !== null);

  ruleNodes.main = entries;

  return { name: "sigil-exported", entry: "main", variables, nodes: ruleNodes };
}

/**
 * 转换单个节点（不处理线性后续），对 if/loop 递归其分支。
 */
function convertSingleNode(
  node: SigilNode,
  allNodes: SigilNode[],
  childrenMap: Map<string, ChildEntry[]>,
  visited: Set<string>,
): RuleNode | null {
  const { sigilNodeType } = node.data;
  const config = node.data.config as Record<string, unknown>;
  const children = childrenMap.get(node.id) ?? [];

  switch (sigilNodeType) {
    case "set": {
      return {
        type: "set",
        label: node.id,
        variable: (config.variable as string) ?? "",
        value: (config.value as AssignTemplate) ?? "",
      };
    }

    case "if": {
      const thenChild = children.find((c) => c.handle === "then")?.targetId;
      const elseChild = children.find((c) => c.handle === "else")?.targetId;

      const thenBody = thenChild
        ? collectLinearChain(thenChild, allNodes, childrenMap, new Set(visited))
        : [];
      const elseBody = elseChild
        ? collectLinearChain(elseChild, allNodes, childrenMap, new Set(visited))
        : [];

      return {
        type: "if",
        label: node.id,
        condition: (config.condition as string) ?? "true",
        then: thenBody,
        else: elseBody.length > 0 ? elseBody : undefined,
      };
    }

    case "foreach": {
      // 从 foreach 的 body handle 连接的第一个节点开始收集 body
      const bodyEntry = children.find((c) => c.handle === "body");
      const body = bodyEntry
        ? collectLinearChain(
            bodyEntry.targetId,
            allNodes,
            childrenMap,
            new Set(),
          )
        : [];

      return {
        type: "foreach",
        label: node.id,
        collection: (config.collection as string) ?? "[]",
        item: (config.item as string) ?? "item",
        index: (config.index as string) ?? undefined,
        body,
      };
    }

    case "while": {
      const bodyEntry = children.find((c) => c.handle === "body");
      const body = bodyEntry
        ? collectLinearChain(
            bodyEntry.targetId,
            allNodes,
            childrenMap,
            new Set(),
          )
        : [];

      return {
        type: "while",
        label: node.id,
        condition: (config.condition as string) ?? "true",
        body,
      };
    }

    case "break": {
      return { type: "break", label: node.id };
    }

    case "continue": {
      return { type: "continue", label: node.id };
    }

    case "return": {
      return {
        type: "return",
        label: node.id,
        value: (config.value as string) ?? undefined,
      };
    }

    case "custom": {
      return {
        type: "custom",
        label: node.id,
        name: (config.name as string) ?? "",
        params: (config.params as AssignTemplate) ?? {},
      };
    }

    case "exec": {
      return {
        type: "exec",
        label: node.id,
        expression: (config.expression as string) ?? "",
      };
    }

    default:
      return null;
  }
}

/**
 * 收集从 startId 开始的一条线性链，
 * 将 if/loop 内的分支递归处理，其余节点依次排列。
 */
function collectLinearChain(
  startId: string,
  allNodes: SigilNode[],
  childrenMap: Map<string, ChildEntry[]>,
  visited: Set<string>,
): RuleNode[] {
  const result: RuleNode[] = [];
  let currentId: string | undefined = startId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    lastExportOrder.push(currentId); // 记录 flow nodeId

    const node = allNodes.find((n) => n.id === currentId);
    if (!node) break;

    // 将当前节点转换为 RuleNode
    const converted = convertSingleNode(node, allNodes, childrenMap, visited);
    if (converted) {
      result.push(converted);
    }

    // 找到下一个线性节点
    const children: ChildEntry[] = childrenMap.get(currentId) ?? [];
    const nextHandle = getNextLinearHandle(node, children);
    const nextChild: ChildEntry | undefined = nextHandle
      ? children.find((c) => c.handle === nextHandle)
      : undefined;

    currentId = nextChild?.targetId;
  }

  return result;
}

/**
 * 对 if/loop 节点，返回用于线性继续的 handle 名称；
 * 对普通节点，返回默认的线性 handle。
 */
function getNextLinearHandle(
  node: SigilNode,
  children: ChildEntry[],
): string | null {
  switch (node.data.sigilNodeType) {
    case "if":
      // if 执行完后通过 out handle 继续
      return "out";
    case "foreach":
    case "while":
      // foreach/while 的 next 是其 out handle
      return "out";
    case "break":
    case "continue":
    case "return":
      return null;
    default:
      return children[0]?.handle ?? null;
  }
}

/** 将 RuleDefinition 导出为 JSON 字符串 */
export function exportToJson(): string {
  const rule = exportToRuleDefinition();
  return JSON.stringify(rule, null, 2);
}
