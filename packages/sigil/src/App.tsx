import NodePalette from './components/panels/NodePalette';
import PropertiesPanel from './components/panels/PropertiesPanel';
import FlowCanvas from './components/FlowCanvas';
import ToolBar from './components/ToolBar';
import ExecutionControls from './components/ExecutionControls';
import LogPanel from './components/panels/LogPanel';
import styles from './App.module.css';

export default function App() {
  return (
    <div className={styles.layout}>
      <NodePalette />
      <div className={styles.canvas}>
        <div className={styles.topbar}>
          <ExecutionControls />
          <ToolBar />
        </div>
        <FlowCanvas />
        <LogPanel />
      </div>
      <PropertiesPanel />
    </div>
  );
}
