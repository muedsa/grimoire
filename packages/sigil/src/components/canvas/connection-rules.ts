import { Connection } from '@xyflow/react';
import { useFlowStore, START_NODE_ID } from '../../store/flow';

/** 验证连线是否符合语义规则 */
export function isValidConnection(
  connection: Connection,
  nodes: ReturnType<typeof useFlowStore.getState>['nodes'],
  edges: ReturnType<typeof useFlowStore.getState>['edges'],
): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);
  if (!sourceNode || !targetNode) return false;

  // 不能连接到自己
  if (connection.source === connection.target) return false;

  // break/continue/return 不能有出边
  if (['break', 'continue', 'return'].includes(sourceNode.data.sigilNodeType)) return false;

  // 起始节点不能被连接为目标
  if (connection.target === START_NODE_ID) return false;

  const sourceHandle = connection.sourceHandle ?? 'out';

  // foreach/while/if 的 out handle 允许连接到外部节点（离开容器）
  // loop-group 的 body handle 允许连接到内部节点
  // 其他情况：内部节点不能连接到外部，外部也不能连入内部
  if (sourceHandle !== 'out' && sourceHandle !== 'body' && !!sourceNode.parentId !== !!targetNode.parentId) return false;

  // 每个 handle 只能连一条线
  const targetHandle = connection.targetHandle ?? 'in';
  const hasSourceConnection = edges.some(
    (e) => e.source === connection.source && e.sourceHandle === sourceHandle,
  );
  const hasTargetConnection = edges.some(
    (e) => e.target === connection.target && e.targetHandle === targetHandle,
  );
  if (hasSourceConnection || hasTargetConnection) return false;

  return true;
}
