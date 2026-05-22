import { NodeTypes } from "@xyflow/react";
import StartNode from "./StartNode";
import ForeachGroup from "./ForeachGroup";
import WhileGroup from "./WhileGroup";
import SetNode from "./SetNode";
import IfNode from "./IfNode";
import CustomNode from "./CustomNode";
import ReturnNode from "./ReturnNode";
import BreakNode from "./BreakNode";
import ContinueNode from "./ContinueNode";
import ExecNode from "./ExecNode";

/** 注册所有节点类型到 React Flow — 每个类型一个独立组件 */
export const nodeTypes = {
  startNode: StartNode,
  foreachGroup: ForeachGroup,
  whileGroup: WhileGroup,
  set: SetNode,
  if: IfNode,
  custom: CustomNode,
  return: ReturnNode,
  break: BreakNode,
  continue: ContinueNode,
  exec: ExecNode,
} as NodeTypes;
