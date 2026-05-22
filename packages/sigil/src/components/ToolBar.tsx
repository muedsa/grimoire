import { useState, useRef, useEffect } from "react";
import type { AssignTemplate } from "@grimoire/rune";
import { Eye, EyeOff, Download, Upload, LayoutGrid } from "lucide-react";
import { exportToJson } from "@/utils/export";
import { parseRuleJson, ruleToFlowState } from "@/utils/import";
import { useFlowStore } from "@/store/flow";
import styles from "./ToolBar.module.css"; // 复用原有样式

function ToolBar() {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceNodes = useFlowStore((s) => s.replaceNodes);
  const applyAutoLayout = useFlowStore((s) => s.applyAutoLayout);
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);
  const nodesInitialized = useFlowStore((s) => s.nodesInitialized);
  const [autoLayouting, setAutoLayouting] = useState(false);
  const [nodesInitializedCount, setNodesInitializedCount] = useState(0);
  useEffect(() => {
    if (nodesInitialized) {
      setNodesInitializedCount((c) => c + 1);
    }
  }, [nodesInitialized]);

  useEffect(() => {
    if (autoLayouting && nodesInitializedCount > 0) {
      applyAutoLayout();
      setAutoLayouting(false);
    }
  }, [nodesInitializedCount, autoLayouting, applyAutoLayout]);

  /** 导出 JSON 文件 */
  const handleExport = () => {
    const json = exportToJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rule.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 切换 JSON 预览 */
  const handlePreview = () => {
    if (preview) {
      setPreview(null);
    } else {
      setPreview(exportToJson());
    }
  };

  /** 触发文件选择器 */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /** 读取并导入 JSON 文件 */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const raw = evt.target?.result as string;
        const rule = parseRuleJson(raw);

        // 更新 start 节点的 variables
        if (rule.variables && Object.keys(rule.variables).length > 0) {
          updateNodeConfig("start-node", {
            variables: rule.variables as AssignTemplate,
          });
        }

        // 转换并写入画布
        const { nodes, edges } = ruleToFlowState(rule);
        replaceNodes(nodes, edges);
        setNodesInitializedCount(0);
        setAutoLayouting(true); // 导入后自动布局
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "导入失败";
        alert(msg);
      }
    };
    reader.onerror = () => {
      alert("读取文件失败");
    };
    reader.readAsText(file);

    // 重置 input，允许重复导入同一文件
    e.target.value = "";
  };

  /** 自动布局 */
  const handleAutoLayout = () => {
    applyAutoLayout();
  };

  return (
    <div className={styles.exportBar}>
      <div className={styles.buttons}>
        <button
          onClick={handlePreview}
          className={`${styles.btn} ${styles.btnPreview}`}
        >
          {preview ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{preview ? "隐藏预览" : "JSON 预览"}</span>
        </button>
        <button
          onClick={handleExport}
          className={`${styles.btn} ${styles.btnExport}`}
        >
          <Download size={16} />
          <span>导出 JSON</span>
        </button>
        <button
          onClick={handleImportClick}
          className={`${styles.btn} ${styles.btnImport}`}
        >
          <Upload size={16} />
          <span>导入 JSON</span>
        </button>
        <button
          onClick={handleAutoLayout}
          className={`${styles.btn} ${styles.btnLayout}`}
        >
          <LayoutGrid size={16} />
          <span>自动布局</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
      {preview && <pre className={styles.previewContent}>{preview}</pre>}
    </div>
  );
}

export default ToolBar;
