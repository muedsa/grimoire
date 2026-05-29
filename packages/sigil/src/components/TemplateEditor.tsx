import { useState, useCallback, useEffect, useRef } from "react";
import styles from "./TemplateEditor.module.css";

type ValType = "string" | "number" | "boolean" | "array" | "object";

type AssignTemplate =
  | string
  | number
  | boolean
  | AssignTemplate[]
  | { [key: string]: AssignTemplate };

interface TemplateEditorProps {
  value: AssignTemplate;
  onChange: (value: AssignTemplate) => void;
  onClose: () => void;
}

function guessType(val: AssignTemplate): ValType {
  if (val === undefined || val === null) return "string";
  if (Array.isArray(val)) return "array";
  switch (typeof val) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    default:
      return "string";
  }
}

function convertValue(val: AssignTemplate, toType: ValType): AssignTemplate {
  if (toType === "string") return String(val ?? "");
  if (toType === "number") {
    const n = typeof val === "number" ? val : Number(val);
    return isNaN(n) ? 0 : n;
  }
  if (toType === "boolean") return val === true || val === "true";
  if (toType === "array")
    return Array.isArray(val) ? val : val !== undefined ? [val] : [];
  if (toType === "object") {
    if (typeof val === "object" && !Array.isArray(val) && val !== null)
      return val;
    return {};
  }
  return "";
}

/** 简单类型值的内联编辑器 */
function SimpleValueEditor({
  value,
  onChange,
}: {
  value: AssignTemplate;
  onChange: (v: AssignTemplate) => void;
}) {
  if (typeof value === "string") {
    return (
      <>
        <input
          className={styles.valueInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className={styles.hint}>使用 {"${expr}"} 插入表达式</p>
      </>
    );
  }
  if (typeof value === "number") {
    return (
      <input
        className={styles.valueInput}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  if (typeof value === "boolean") {
    return (
      <select
        className={styles.valueSelect}
        value={String(value)}
        onChange={(e) => onChange(e.target.value === "true")}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  // 兜底：非预期类型显示文本输入
  return (
    <input
      className={styles.valueInput}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** 递归的值编辑器 — 根据类型选择渲染方式 */
function TemplateValueEditor({
  value,
  onChange,
}: {
  value: AssignTemplate;
  onChange: (v: AssignTemplate) => void;
}) {
  const [currentType, setCurrentType] = useState<ValType>(() =>
    guessType(value),
  );

  // 当外部修改 value 时（如父组件更新），同步 currentType
  useEffect(() => {
    setCurrentType(guessType(value));
  }, [value]);

  const handleTypeChange = useCallback(
    (newType: ValType) => {
      setCurrentType(newType);
      onChange(convertValue(value, newType));
    },
    [value, onChange],
  );

  // 所有类型按钮 — 始终显示全部 5 种选项
  const allTypes: ValType[] = [
    "string",
    "number",
    "boolean",
    "array",
    "object",
  ];

  if (
    currentType === "string" ||
    currentType === "number" ||
    currentType === "boolean"
  ) {
    return (
      <div>
        <div className={styles.typeSelector}>
          {allTypes.map((t) => (
            <button
              key={t}
              className={`${styles.typeBtn} ${currentType === t ? styles.typeBtnActive : ""}`}
              onClick={() => handleTypeChange(t)}
            >
              {t === "string"
                ? "文本"
                : t === "number"
                  ? "数字"
                  : t === "boolean"
                    ? "布尔"
                    : t === "array"
                      ? "数组"
                      : "对象"}
            </button>
          ))}
        </div>
        <SimpleValueEditor value={value} onChange={onChange} />
      </div>
    );
  }

  // array or object — show summary + expand/collapse
  if (currentType === "array") {
    const arr = value as AssignTemplate[];
    return (
      <div>
        <div className={styles.typeSelector}>
          {allTypes.map((t) => (
            <button
              key={t}
              className={`${styles.typeBtn} ${currentType === t ? styles.typeBtnActive : ""}`}
              onClick={() => handleTypeChange(t)}
            >
              {t === "string"
                ? "文本"
                : t === "number"
                  ? "数字"
                  : t === "boolean"
                    ? "布尔"
                    : t === "array"
                      ? "数组"
                      : "对象"}
            </button>
          ))}
        </div>
        <ArrayEditor value={arr} onChange={onChange} />
      </div>
    );
  }

  if (currentType === "object") {
    const obj = value as Record<string, AssignTemplate>;
    return (
      <div>
        <div className={styles.typeSelector}>
          {allTypes.map((t) => (
            <button
              key={t}
              className={`${styles.typeBtn} ${currentType === t ? styles.typeBtnActive : ""}`}
              onClick={() => handleTypeChange(t)}
            >
              {t === "string"
                ? "文本"
                : t === "number"
                  ? "数字"
                  : t === "boolean"
                    ? "布尔"
                    : t === "array"
                      ? "数组"
                      : "对象"}
            </button>
          ))}
        </div>
        <ObjectEditor value={obj} onChange={onChange} />
      </div>
    );
  }

  return null;
}

/** 数组编辑器 */
function ArrayEditor({
  value,
  onChange,
}: {
  value: AssignTemplate[];
  onChange: (v: AssignTemplate[]) => void;
}) {
  const updateItem = (index: number, newVal: AssignTemplate) => {
    const next = [...value];
    next[index] = newVal;
    onChange(next);
  };

  const removeItem = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
  };

  const addItem = () => {
    onChange([...value, ""]);
  };

  return (
    <div>
      {value.map((item, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.rowIndex}>{i}</span>
          <div style={{ flex: 1 }}>
            <TemplateValueEditor
              value={item}
              onChange={(v) => updateItem(i, v)}
            />
          </div>
          <button
            className={styles.deleteBtn}
            onClick={() => removeItem(i)}
            title="删除"
          >
            ×
          </button>
        </div>
      ))}
      <button className={styles.addBtn} onClick={addItem}>
        + 添加元素
      </button>
    </div>
  );
}

/** 对象编辑器 */
function ObjectEditor({
  value,
  onChange,
}: {
  value: Record<string, AssignTemplate>;
  onChange: (v: Record<string, AssignTemplate>) => void;
}) {
  // 稳定 ID 生成器：React key 使用稳定 ID 而非对象键名，避免重命名键时组件被卸载重建
  const idCounterRef = useRef(0);
  const keyToIdRef = useRef<Map<string, number>>(new Map());

  // 获取或分配键名对应的稳定 ID
  const getStableId = (key: string): number => {
    const map = keyToIdRef.current;
    let id = map.get(key);
    if (id === undefined) {
      id = ++idCounterRef.current;
      map.set(key, id);
    }
    return id;
  };

  const updateKey = (
    oldKey: string,
    newKey: string,
    newVal?: AssignTemplate,
  ) => {
    const next: Record<string, AssignTemplate> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === oldKey) {
        next[newKey] = newVal ?? v;
      } else {
        next[k] = v;
      }
    }
    onChange(next);
  };

  const updateVal = (key: string, newVal: AssignTemplate) => {
    onChange({ ...value, [key]: newVal });
  };

  const renameKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    // 将稳定 ID 从旧键名转移到新键名，确保重命名后同一字段的 React key 不变
    const map = keyToIdRef.current;
    const id = map.get(oldKey);
    if (id !== undefined) {
      map.set(newKey, id);
      map.delete(oldKey);
    }
    updateKey(oldKey, newKey);
  };

  const deleteKey = (key: string) => {
    keyToIdRef.current.delete(key);
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  const addField = () => {
    let key = "key";
    let n = 1;
    while (key in value) {
      key = `key${n++}`;
    }
    // 预先为新键名分配稳定 ID
    getStableId(key);
    onChange({ ...value, [key]: "" });
  };

  return (
    <div>
      {Object.entries(value).map(([key, val]) => (
        <div key={getStableId(key)} className={styles.row}>
          <input
            className={styles.keyInput}
            value={key}
            onChange={(e) => renameKey(key, e.target.value)}
            placeholder="键名"
          />
          <div style={{ flex: 1 }}>
            <TemplateValueEditor
              value={val}
              onChange={(v) => updateVal(key, v)}
            />
          </div>
          <button
            className={styles.deleteBtn}
            onClick={() => deleteKey(key)}
            title="删除"
          >
            ×
          </button>
        </div>
      ))}
      <button className={styles.addBtn} onClick={addField}>
        + 添加字段
      </button>
    </div>
  );
}

export default function TemplateEditor({
  value,
  onChange,
  onClose,
}: TemplateEditorProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>编辑模板值</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={styles.body}>
          <TemplateValueEditor value={value} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}
