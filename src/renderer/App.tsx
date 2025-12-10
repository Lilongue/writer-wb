import { useState, useEffect } from 'react';
import 'antd/dist/reset.css';
import './App.css';
import 'rc-tree/assets/index.css';
import { Layout, Empty } from 'antd';
import NarrativeTree from './components/NarrativeTree';
import WorldObjectTree from './components/WorldObjectTree';
import ContentDisplay from './components/ContentDisplay';
import TemplateManagerModal from './components/TemplateManager';
import { useProject } from './contexts/ProjectContext'; // Import useProject

const { Sider, Content } = Layout;

export default function App() {
  const { isProjectOpen } = useProject(); // Use the hook to get project state

  const [selection, setSelection] = useState<{
    id: number | null;
    type: 'narrative' | 'world' | null;
  }>({ id: null, type: null });
  const [templateManagerVisible, setTemplateManagerVisible] = useState(false);

  useEffect(() => {
    // Keep only the template manager listener
    const cleanupManager = window.electron.ipcRenderer.on(
      'open-template-manager',
      () => {
        setTemplateManagerVisible(true);
      },
    );

    // If project is closed, clear selection
    if (!isProjectOpen) {
      setSelection({ id: null, type: null });
    }

    return () => {
      cleanupManager();
    };
  }, [isProjectOpen]); // Rerun effect when isProjectOpen changes

  const handleNarrativeSelect = (id: number | null) => {
    setSelection({ id, type: 'narrative' });
  };

  const handleWorldObjectSelect = (key: string | null) => {
    setSelection({ id: key ? parseInt(key, 10) : null, type: 'world' });
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={250} theme="light" style={{ overflowY: 'auto' }}>
        {isProjectOpen ? ( // Use isProjectOpen from context
          <>
            <NarrativeTree
              onSelect={handleNarrativeSelect}
            />
            <WorldObjectTree
              onSelect={handleWorldObjectSelect}
              selectedId={selection.id}
              selectedType={selection.type === 'world' ? 'world' : null}
            />
          </>
        ) : (
          <div className="empty-project-container">
            <Empty description="Проект не открыт. Используйте меню Файл -> Создать/Открыть" />
          </div>
        )}
      </Sider>
      <Content>
        <ContentDisplay
          selectedId={selection.id}
          selectedType={selection.type}
        />
      </Content>
      <TemplateManagerModal
        visible={templateManagerVisible}
        onClose={() => setTemplateManagerVisible(false)}
      />
    </Layout>
  );
}
