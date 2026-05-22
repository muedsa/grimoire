/** Rune 规则引擎的节点类型定义（与 packages/rune 保持一致） */

export type NodeType =
  | 'set'
  | 'if'
  | 'foreach'
  | 'while'
  | 'break'
  | 'continue'
  | 'return'
  | 'custom'
  | 'exec';

export interface BaseNodeDef {
  type: NodeType;
  label?: string;
}

export interface SetNodeDef extends BaseNodeDef {
  type: 'set';
  variable: string;
  value: string | number | boolean | null | object | Array<unknown>;
}

export interface IfNodeDef extends BaseNodeDef {
  type: 'if';
  condition: string;
  then: RuleNodeDef[];
  else?: RuleNodeDef[];
}

export interface ForeachNodeDef extends BaseNodeDef {
  type: 'foreach';
  collection: string;
  item: string;
  index?: string;
  body: RuleNodeDef[];
}

export interface WhileNodeDef extends BaseNodeDef {
  type: 'while';
  condition: string;
  body: RuleNodeDef[];
}

export interface BreakNodeDef extends BaseNodeDef {
  type: 'break';
}

export interface ContinueNodeDef extends BaseNodeDef {
  type: 'continue';
}

export interface ReturnNodeDef extends BaseNodeDef {
  type: 'return';
  value?: string;
}

export interface CustomNodeDef extends BaseNodeDef {
  type: 'custom';
  name: string;
  params?: Record<string, unknown>;
}

export interface ExecNodeDef extends BaseNodeDef {
  type: 'exec';
  expression: string;
}

export type RuleNodeDef =
  | SetNodeDef
  | IfNodeDef
  | ForeachNodeDef
  | WhileNodeDef
  | BreakNodeDef
  | ContinueNodeDef
  | ReturnNodeDef
  | CustomNodeDef
  | ExecNodeDef;

/** 顶层规则定义 */
export interface RuleDefinition {
  name?: string;
  entry?: string;
  variables?: Record<string, unknown>;
  nodes: Record<string, RuleNodeDef[]>;
}

import {
  Pencil,
  GitBranch,
  List,
  RefreshCw,
  CircleStop,
  SkipForward,
  CornerDownLeft,
  Puzzle,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** 节点类型的显示名称和图标映射 */
export const NODE_META: Record<NodeType, { label: string; color: string; icon: LucideIcon }> = {
  set:      { label: 'Set',      color: '#3b82f6', icon: Pencil },
  if:       { label: 'If',       color: '#f59e0b', icon: GitBranch },
  foreach:  { label: 'Foreach',  color: '#8b5cf6', icon: List },
  while:    { label: 'While',    color: '#f59e0b', icon: RefreshCw },
  break:    { label: 'Break',    color: '#ef4444', icon: CircleStop },
  continue: { label: 'Continue', color: '#f97316', icon: SkipForward },
  return:   { label: 'Return',   color: '#10b981', icon: CornerDownLeft },
  custom:   { label: 'Custom',   color: '#6366f1', icon: Puzzle },
  exec:     { label: 'Exec',     color: '#06b6d4', icon: Zap },
};
