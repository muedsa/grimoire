import { useCallback } from "react";
import { NodeType, NODE_META } from "@/types/rune";
import sigilIcon from "@/assets/sigil.svg";
import styles from "./NodePalette.module.css";

const NODE_TYPES: { type: NodeType; description: string }[] = [
  { type: "exec", description: "执行表达式" },
  { type: "set", description: "设置变量值" },
  { type: "if", description: "条件分支" },
  { type: "foreach", description: "遍历集合" },
  { type: "while", description: "条件循环" },
  { type: "break", description: "跳出循环" },
  { type: "continue", description: "继续下一轮" },
  { type: "return", description: "返回并终止" },
  { type: "custom", description: "自定义节点" },
];

function NodePalette() {
  const onDragStart = useCallback((event: React.DragEvent, type: NodeType) => {
    if (event.target instanceof HTMLElement) {
      const rect = event.target.getBoundingClientRect();
      event.dataTransfer.setData(
        "application/mouseOffsetOnElement",
        event.clientX - rect.x + "," + (event.clientY - rect.y),
      );
    }
    event.dataTransfer.setData("application/nodeType", type);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  return (
    <div className={styles.palette}>
      <div className={styles.logo}>
        <img src={sigilIcon} alt="Sigil" className={styles.logoIcon} />
        <span className={styles.logoText}>Sigil</span>
      </div>
      <h3 className={styles.title}>节点库</h3>
      {NODE_TYPES.map(({ type, description }) => {
        const meta = NODE_META[type];
        return (
          <div
            key={type}
            className={styles.item}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
          >
            <span
              className={styles.dot}
              style={{ backgroundColor: meta.color }}
            />
            <meta.icon size={14} />
            <span className={styles.name}>{meta.label}</span>
            <span className={styles.desc}>{description}</span>
          </div>
        );
      })}
    </div>
  );
}

export default NodePalette;
