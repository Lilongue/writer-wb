import { useState, useEffect } from 'react';
import 'antd/dist/reset.css';
import './App.css';
import 'rc-tree/assets/index.css';
import { Layout, Empty } from 'antd';
import NarrativeTree from './components/NarrativeTree';
import WorldObjectTree from './components/WorldObjectTree';
import ContentDisplay from './components/ContentDisplay';
import TemplateManagerModal from './components/TemplateManagerModal';

const { Sider, Content } = Layout;

export default function App() {
  const [projectState, setProjectState] = useState({ isOpen: false, key: 0 });
  const [selection, setSelection] = useState<{
    id: number | null;
    type: 'narrative' | 'world' | null;
  }>({ id: null, type: null });
  const [templateManagerVisible, setTemplateManagerVisible] = useState(false);

  useEffect(() => {
    const cleanupManager = window.electron.ipcRenderer.on(
      'open-template-manager',
      () => {
        setTemplateManagerVisible(true);
      },
    );

    const cleanupOpened = window.electron.ipcRenderer.on(
      'project-opened',
      () => {
        setProjectState((prevState) => ({
          isOpen: true,
          key: prevState.key + 1,
        }));
      },
    );

    const cleanupClosed = window.electron.ipcRenderer.on(
      'project-closed',
      () => {
        setProjectState({ isOpen: false, key: 0 });
        setSelection({ id: null, type: null });
      },
    );

    return () => {
      cleanupManager();
      cleanupOpened();
      cleanupClosed();
    };
  }, []);

  const handleNarrativeSelect = (id: number | null) => {
    setSelection({ id, type: 'narrative' });
  };

  const handleWorldObjectSelect = (key: string | null) => {
    setSelection({ id: key ? parseInt(key, 10) : null, type: 'world' });
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={250} theme="light" style={{ overflowY: 'auto' }}>
        {projectState.isOpen ? (
          <>
            <NarrativeTree
              key={projectState.key}
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
