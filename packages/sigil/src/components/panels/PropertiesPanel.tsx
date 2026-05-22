import { useState } from "react";
import { useFlowStore } from "@/store/flow";
import { NODE_META } from "@/types/rune";
import TemplateEditor from "@/components/TemplateEditor";
import { templateSummary } from "@/utils/templateSummary";
import styles from "./PropertiesPanel.module.css";

type AssignTemplate =
  | string
  | number
  | boolean
  | AssignTemplate[]
  | { [key: string]: AssignTemplate };

function PropertiesPanel() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [editingCustomParams, setEditingCustomParams] = useState(false);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) {
    return (
      <div className={styles.panel}>
        <h3 className={styles.title}>属性面板</h3>
        <p className={styles.empty}>选中一个节点以编辑属性</p>
      </div>
    );
  }

  // 起始节点：初始变量编辑（复用 TemplateEditor）
  if (node.data.sigilNodeType === "start") {
    const variables =
      (node.data.config as { variables?: AssignTemplate }).variables ?? {};

    return (
      <div className={styles.panel}>
        <h3 className={styles.title}>
          <span className={styles.dot} style={{ backgroundColor: "#10b981" }} />
          开始节点
        </h3>

        <label className={styles.field}>
          <span>初始变量</span>
          <p className={styles.hint}>定义规则执行前的初始变量值</p>
          <div className={styles.templatePreview}>
            <code>{templateSummary(variables)}</code>
            <button
              className={styles.editBtn}
              onClick={() => setEditingTemplate(true)}
            >
              编辑
            </button>
          </div>
        </label>
        {editingTemplate && (
          <TemplateEditor
            value={variables}
            onChange={(val) => updateNodeConfig(node.id, { variables: val })}
            onClose={() => setEditingTemplate(false)}
          />
        )}
      </div>
    );
  }

  const meta = NODE_META[node.data.sigilNodeType as keyof typeof NODE_META];

  const config = node.data.config as Record<string, unknown>;

  const update = (key: string, value: unknown) => {
    updateNodeConfig(node.id, { [key]: value });
  };

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>
        <span className={styles.dot} style={{ backgroundColor: meta.color }} />
        {meta.label} 属性 ({selectedNodeId})
      </h3>

      {node.data.sigilNodeType === "set" && (
        <>
          <label className={styles.field}>
            <span>变量路径</span>
            <input
              type="text"
              value={(config.variable as string) ?? ""}
              onChange={(e) => update("variable", e.target.value)}
              placeholder="例如: result.greeting"
            />
          </label>
          <label className={styles.field}>
            <span>值</span>
            <div className={styles.templatePreview}>
              <code>{templateSummary(config.value as any)}</code>
              <button
                className={styles.editBtn}
                onClick={() => setEditingTemplate(true)}
              >
                编辑
              </button>
            </div>
          </label>
          {editingTemplate && (
            <TemplateEditor
              value={(config.value as string | number | boolean | null) ?? ""}
              onChange={(val) => update("value", val)}
              onClose={() => setEditingTemplate(false)}
            />
          )}
        </>
      )}

      {node.data.sigilNodeType === "if" && (
        <label className={styles.field}>
          <span>条件表达式</span>
          <input
            type="text"
            value={(config.condition as string) ?? ""}
            onChange={(e) => update("condition", e.target.value)}
            placeholder="例如: data.level > 3"
          />
        </label>
      )}

      {node.data.sigilNodeType === "foreach" && (
        <>
          <label className={styles.field}>
            <span>集合表达式</span>
            <input
              type="text"
              value={(config.collection as string) ?? ""}
              onChange={(e) => update("collection", e.target.value)}
              placeholder="例如: data.items"
            />
          </label>
          <label className={styles.field}>
            <span>当前项变量名</span>
            <input
              type="text"
              value={(config.item as string) ?? ""}
              onChange={(e) => update("item", e.target.value)}
              placeholder="例如: item"
            />
          </label>
          <label className={styles.field}>
            <span>索引变量名（可选）</span>
            <input
              type="text"
              value={(config.index as string) ?? ""}
              onChange={(e) => update("index", e.target.value)}
              placeholder="例如: idx"
            />
          </label>
        </>
      )}

      {node.data.sigilNodeType === "while" && (
        <label className={styles.field}>
          <span>条件表达式</span>
          <input
            type="text"
            value={(config.condition as string) ?? ""}
            onChange={(e) => update("condition", e.target.value)}
            placeholder="例如: data.count < 10"
          />
        </label>
      )}

      {node.data.sigilNodeType === "return" && (
        <label className={styles.field}>
          <span>返回值表达式</span>
          <input
            type="text"
            value={(config.value as string) ?? ""}
            onChange={(e) => update("value", e.target.value)}
            placeholder="例如: data.value * 2"
          />
        </label>
      )}

      {node.data.sigilNodeType === "exec" && (
        <label className={styles.field}>
          <span>表达式</span>
          <input
            type="text"
            value={(config.expression as string) ?? ""}
            onChange={(e) => update("expression", e.target.value)}
            placeholder="例如: log(data.result)"
          />
        </label>
      )}

      {node.data.sigilNodeType === "custom" && (
        <>
          <label className={styles.field}>
            <span>节点名称</span>
            <input
              type="text"
              value={(config.name as string) ?? ""}
              onChange={(e) => update("name", e.target.value)}
              placeholder="例如: http.get"
            />
          </label>
          <label className={styles.field}>
            <span>参数</span>
            <div className={styles.templatePreview}>
              <code>{templateSummary(config.params as any)}</code>
              <button
                className={styles.editBtn}
                onClick={() => setEditingCustomParams(true)}
              >
                编辑
              </button>
            </div>
          </label>
          {editingCustomParams && (
            <TemplateEditor
              value={(config.params as AssignTemplate) ?? {}}
              onChange={(val) => update("params", val)}
              onClose={() => setEditingCustomParams(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default PropertiesPanel;
