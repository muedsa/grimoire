import { create } from "zustand";
import {
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Connection,
} from "@xyflow/react";
import type { AssignTemplate, RuleNode } from "@grimoire/rune";
import {
  layoutAndFlatten,
  GAP,
  createNodeSizer,
  getFlowNodeSize,
} from "@/utils/layout";

/**
 * Flow 画布自身的节点类型枚举。
 * 与 rune 引擎的 NodeType 解耦，导出时再做映射。
 */
export type SigilNodeType =
  | "start"
  | "set"
  | "if"
  | "foreach"
  | "while"
  | "break"
  | "continue"
  | "return"
  | "custom"
  | "exec";

/** 各节点类型的配置属性——用区分联合类型精确定义 */
type SetConfig = { variable?: string; value?: AssignTemplate };
type IfConfig = { condition?: string };
type ForeachConfig = {
  collection?: string;
  item?: string;
  index?: string;
};
type WhileConfig = { condition?: string };
type BreakConfig = {};
type ContinueConfig = {};
type ReturnConfig = { value?: AssignTemplate };
type CustomConfig = { name?: string; params?: AssignTemplate };
type ExecConfig = { expression?: string };
type StartConfig = { variables?: AssignTemplate };

/** 每个节点类型的独立 data 定义 */
export type StartNodeData = { sigilNodeType: "start"; config: StartConfig };
export type SetNodeData = { sigilNodeType: "set"; config: SetConfig };
export type IfNodeData = { sigilNodeType: "if"; config: IfConfig };
export type ForeachNodeData = {
  sigilNodeType: "foreach";
  config: ForeachConfig;
};
export type WhileNodeData = { sigilNodeType: "while"; config: WhileConfig };
export type BreakNodeData = { sigilNodeType: "break"; config: BreakConfig };
export type ContinueNodeData = {
  sigilNodeType: "continue";
  config: ContinueConfig;
};
export type ReturnNodeData = { sigilNodeType: "return"; config: ReturnConfig };
export type CustomNodeData = { sigilNodeType: "custom"; config: CustomConfig };
export type ExecNodeData = { sigilNodeType: "exec"; config: ExecConfig };

/** Flow 节点数据的区分联合类型 */
export type SigilNodeData =
  | StartNodeData
  | SetNodeData
  | IfNodeData
  | ForeachNodeData
  | WhileNodeData
  | BreakNodeData
  | ContinueNodeData
  | ReturnNodeData
  | CustomNodeData
  | ExecNodeData;

/** 每个节点类型的完整 Node 定义 */
export type StartNode = Node<StartNodeData>;
export type SetNode = Node<SetNodeData>;
export type IfNode = Node<IfNodeData>;
export type ForeachNode = Node<ForeachNodeData>;
export type WhileNode = Node<WhileNodeData>;
export type BreakNode = Node<BreakNodeData>;
export type ContinueNode = Node<ContinueNodeData>;
export type ReturnNode = Node<ReturnNodeData>;
export type CustomNode = Node<CustomNodeData>;
export type ExecNode = Node<ExecNodeData>;

export type SigilNode =
  | StartNode
  | SetNode
  | IfNode
  | ForeachNode
  | WhileNode
  | BreakNode
  | ContinueNode
  | ReturnNode
  | CustomNode
  | ExecNode;

/** 所有配置的联合类型（用于类型收窄） */
export type NodeConfig =
  | SetConfig
  | IfConfig
  | ForeachConfig
  | WhileConfig
  | BreakConfig
  | ContinueConfig
  | ReturnConfig
  | CustomConfig
  | ExecConfig
  | StartConfig;

/** 所有配置的交集（用于 partial 更新） */
type AllConfigs = SetConfig &
  IfConfig &
  ForeachConfig &
  WhileConfig &
  BreakConfig &
  ContinueConfig &
  ReturnConfig &
  CustomConfig &
  ExecConfig &
  StartConfig;

interface FlowStore {
  nodes: SigilNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  nodesInitialized: boolean;

  onNodesChange: OnNodesChange<SigilNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNode: (id: string | null) => void;
  updateNodeConfig: (id: string, config: Partial<AllConfigs>) => void;

  /** 从侧边栏拖入新节点，parentId 用于将节点放入 foreach/while 容器 */
  addNodeType: (
    type: SigilNodeType,
    position: { x: number; y: number },
    parentId?: string,
  ) => void;
  /** 删除选中节点 */
  deleteSelectedNode: () => void;
  /** 清空所有节点（保留 start）并用新节点/边替换（用于 JSON 导入） */
  replaceNodes: (newNodes: SigilNode[], newEdges: Edge[]) => void;
  onNodesInitializedChange: (initialized: boolean) => void;
  /** 自动排列当前画布中的节点 */
  applyAutoLayout: () => void;
}

/** 起始节点 ID，固定不可变 */
export const START_NODE_ID = "start-node";

let nodeIdCounter = 0;

/** 创建主画布的初始节点 */
function createStartNode(): StartNode {
  return {
    id: START_NODE_ID,
    type: "startNode",
    position: { x: 0, y: 0 },
    data: { sigilNodeType: "start", config: { variables: {} } },
    draggable: true,
    selectable: true,
  };
}

export function generateUniqueNodeId(type: SigilNodeType): string {
  return `${type}-node-${++nodeIdCounter}`;
}

/**
 * 根据已有节点的 ID 重置计数器。
 * 在导入 JSON 规则后调用，确保后续通过 addNodeType 新增的节点不会产生 ID 冲突。
 *
 * 节点 ID 格式为 `<type>-node-<数字>`，遍历所有节点提取最大数字，将计数器设为该值。
 */
function resetNodeIdCounter(nodes: SigilNode[]): void {
  let maxId = 0;
  for (const n of nodes) {
    const match = n.id.match(/-node-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  }
  nodeIdCounter = Math.max(nodeIdCounter, maxId);
}

export function createSigilNode(
  type: SigilNodeType,
  position: { x: number; y: number },
  id?: string,
  parentId?: string,
): SigilNode {
  const isGroupNode = type === "foreach" || type === "while";
  const style = isGroupNode ? { width: 400, height: 300 } : undefined;

  const node = {
    id: id ? id : generateUniqueNodeId(type),
    type:
      type === "foreach"
        ? "foreachGroup"
        : type === "while"
          ? "whileGroup"
          : type,
    position,
    parentId,
    extent: parentId ? "parent" : undefined,
    style,
    resizing: isGroupNode ? true : undefined,
    data: {
      sigilNodeType: type as Exclude<SigilNodeData["sigilNodeType"], "start">,
      config: {},
    },
  } as SigilNode;

  return node;
}

/**
 * 从 React Flow 的节点/边集合提取为 RuleNode[] 树形结构，
 * 供 autoLayout 使用。
 */
function extractTopology(nodes: SigilNode[], edges: Edge[]): RuleNode[] {
  // 构建邻接表
  const childrenMap = new Map<string, { targetId: string; handle: string }[]>();
  for (const e of edges) {
    const list = childrenMap.get(e.source) ?? [];
    list.push({ targetId: e.target, handle: e.sourceHandle ?? "out" });
    childrenMap.set(e.source, list);
  }

  // 从 start 节点的 out 边出发
  const startChildren = childrenMap.get(START_NODE_ID) ?? [];
  const entryIds = startChildren.map((c) => c.targetId);

  const visited = new Set<string>([START_NODE_ID]);
  const result: RuleNode[] = [];

  for (const id of entryIds) {
    const chain = extractLinearChain(id, nodes, childrenMap, visited);
    result.push(...chain);
  }

  return result;
}

function extractLinearChain(
  startId: string,
  allNodes: SigilNode[],
  childrenMap: Map<string, { targetId: string; handle: string }[]>,
  visited: Set<string>,
): RuleNode[] {
  const chain: RuleNode[] = [];
  let currentId: string | undefined = startId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = allNodes.find((n) => n.id === currentId);
    if (!node) break;

    const converted = extractSingleNode(node, allNodes, childrenMap, visited);
    if (converted) chain.push(converted);

    const children = childrenMap.get(currentId) ?? [];
    currentId = getNextLinearId(node, children);
  }

  return chain;
}

function extractSingleNode(
  node: SigilNode,
  allNodes: SigilNode[],
  childrenMap: Map<string, { targetId: string; handle: string }[]>,
  visited: Set<string>,
): RuleNode | null {
  const type = node.data.sigilNodeType;
  const config = node.data.config as Record<string, unknown>;
  const children = childrenMap.get(node.id) ?? [];

  switch (type) {
    case "if": {
      const thenEntry = children.find((c) => c.handle === "then")?.targetId;
      const elseEntry = children.find((c) => c.handle === "else")?.targetId;
      return {
        type: "if",
        label: node.id,
        condition: (config.condition as string) ?? "true",
        then: thenEntry
          ? extractLinearChain(
              thenEntry,
              allNodes,
              childrenMap,
              new Set(visited),
            )
          : [],
        else: elseEntry
          ? extractLinearChain(
              elseEntry,
              allNodes,
              childrenMap,
              new Set(visited),
            )
          : undefined,
      };
    }
    case "foreach": {
      const bodyEntry = children.find((c) => c.handle === "body")?.targetId;
      return {
        type: "foreach",
        label: node.id,
        collection: (config.collection as string) ?? "[]",
        item: (config.item as string) ?? "item",
        index: (config.index as string) ?? undefined,
        body: bodyEntry
          ? extractLinearChain(bodyEntry, allNodes, childrenMap, new Set())
          : [],
      };
    }
    case "while": {
      const bodyEntry = children.find((c) => c.handle === "body")?.targetId;
      return {
        type: "while",
        label: node.id,
        condition: (config.condition as string) ?? "true",
        body: bodyEntry
          ? extractLinearChain(bodyEntry, allNodes, childrenMap, new Set())
          : [],
      };
    }
    case "set":
      return {
        type: "set",
        label: node.id,
        variable: (config.variable as string) ?? "",
        value: (config.value as any) ?? "",
      };
    case "exec":
      return {
        type: "exec",
        label: node.id,
        expression: (config.expression as string) ?? "",
      };
    case "return":
      return {
        type: "return",
        label: node.id,
        value: (config.value as string) ?? undefined,
      };
    case "custom":
      return {
        type: "custom",
        label: node.id,
        name: (config.name as string) ?? "",
        params: (config.params as any) ?? {},
      };
    case "break":
      return { type: "break", label: node.id };
    case "continue":
      return { type: "continue", label: node.id };
    default:
      return null;
  }
}

function getNextLinearId(
  node: SigilNode,
  children: { targetId: string; handle: string }[],
): string | undefined {
  switch (node.data.sigilNodeType) {
    case "if":
    case "foreach":
    case "while":
      return children.find((c) => c.handle === "out")?.targetId;
    case "break":
    case "continue":
    case "return":
      return undefined;
    default:
      return children[0]?.targetId;
  }
}

export const useFlowStore = create<FlowStore>((set, get) => ({
  nodes: [createStartNode()],
  edges: [],
  selectedNodeId: null,
  nodesInitialized: false,

  onNodesChange: (changes) => {
    const safe = changes.filter((c) => {
      if (c.type !== "remove") return true;
      if (c.id === START_NODE_ID) return false;
      return true;
    });
    set({ nodes: applyNodeChanges(safe, get().nodes) });
  },

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection: Connection) =>
    set({
      edges: [
        ...get().edges,
        {
          ...connection,
          id: `${connection.source}-${connection.sourceHandle ?? "out"}-${connection.target}`,
          type: "simplebezier",
          animated: true,
        } as Edge,
      ],
    }),

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  updateNodeConfig: (id, config) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id
          ? ({
              ...n,
              data: { ...n.data, config: { ...n.data.config, ...config } },
            } as SigilNode)
          : n,
      ),
    }),

  addNodeType: (type, position, parentId) => {
    const newNode = createSigilNode(
      type,
      position,
      generateUniqueNodeId(type),
      parentId,
    );
    set({ nodes: [...get().nodes, newNode] });
  },

  deleteSelectedNode: () => {
    const { selectedNodeId, nodes, edges } = get();
    if (!selectedNodeId) return;

    if (selectedNodeId === START_NODE_ID) return;

    const nodeToDelete = nodes.find((n) => n.id === selectedNodeId);
    const isGroupNode =
      nodeToDelete?.type === "foreachGroup" ||
      nodeToDelete?.type === "whileGroup";

    if (isGroupNode) {
      const childIds = nodes
        .filter((n) => n.parentId === selectedNodeId)
        .map((n) => n.id);
      const idsToDelete = new Set([selectedNodeId, ...childIds]);
      set({
        nodes: nodes.filter((n) => !idsToDelete.has(n.id)),
        edges: edges.filter(
          (e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target),
        ),
        selectedNodeId: null,
      });
    } else {
      set({
        nodes: nodes.filter((n) => n.id !== selectedNodeId),
        edges: edges.filter(
          (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
        ),
        selectedNodeId: null,
      });
    }
  },

  /** 清空所有节点（保留 start）并用新节点/边替换（用于 JSON 导入） */
  replaceNodes: (newNodes, newEdges) => {
    const state = get();
    const idsToRemove = new Set(
      state.nodes.filter((n) => n.id !== START_NODE_ID).map((n) => n.id),
    );
    const filteredNodes = state.nodes.filter((n) => !idsToRemove.has(n.id));
    const filteredEdges = state.edges.filter(
      (e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target),
    );
    set({
      nodes: [...filteredNodes, ...newNodes],
      edges: [...filteredEdges, ...newEdges],
    });
    resetNodeIdCounter(newNodes);
  },

  onNodesInitializedChange: (initialized) =>
    set({ nodesInitialized: initialized }),

  /** 自动排列当前画布中的节点 */
  applyAutoLayout: () => {
    const state = get();
    const entryNodes = extractTopology(state.nodes, state.edges);
    if (!entryNodes || entryNodes.length === 0) return;

    console.log("[autoLayout] 提取到", entryNodes.length, "个入口节点");

    // 以 Start 节点当前位置和尺寸为布局原点
    const startNode = state.nodes.find((n) => n.id === START_NODE_ID)!!;
    const startNodeSize = getFlowNodeSize(startNode);
    const centerX = startNode.position.x + startNodeSize.width / 2;
    const originY = startNode.position.y + startNodeSize.height + GAP;

    console.log(
      `[autoLayout] Start 节点: pos=(${startNode?.position.x},${startNode?.position.y}) size=${startNodeSize.width}x${startNodeSize.height} → centerX=${centerX} originY=${originY}`,
    );

    // 执行布局
    const layoutData = layoutAndFlatten(
      entryNodes,
      centerX,
      originY,
      createNodeSizer(state.nodes),
    );

    // 应用新位置到现有节点
    const idToLayouted = new Map<string, (typeof layoutData.nodes)[0]>();
    for (const item of layoutData.nodes) {
      if (item.node.label) {
        idToLayouted.set(item.node.label, item);
      }
    }
    console.log("[autoLayout] 匹配到的节点位置更新：");
    const updatedNodes = state.nodes.map((n) => {
      const layouted = idToLayouted.get(n.id);
      if (!layouted) return n;
      console.log(
        `[autoLayout] ${layouted.node.type} "${n.id}"`,
        JSON.stringify(n, null, 2),
        "->",
        JSON.stringify(layouted, null, 2),
      );
      let resize = {};
      if (layouted.node.type === "foreach" || layouted.node.type === "while") {
        resize = {
          width: layouted.width,
          height: layouted.height,
        };
      }
      return {
        ...n,
        position: { x: layouted.x, y: layouted.y },
        ...resize,
      };
    });

    set({ nodes: updatedNodes });
  },
}));
