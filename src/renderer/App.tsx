/* eslint-disable no-console */
import { useState, useEffect } from 'react';
import 'antd/dist/reset.css';
import './App.css';
import 'rc-tree/assets/index.css';
import { Layout, Empty, notification } from 'antd';
import NarrativeTree from './components/NarrativeTree';
import WorldObjectTree from './components/WorldObjectTree';
import ContentDisplay from './components/ContentDisplay';
import TemplateManagerModal from './components/TemplateManager';
import ProjectSettingsModal from './components/ProjectSettingsModal'; // Import ProjectSettingsModal
import ProjectWizardModal from './components/ProjectWizardModal';
import { useProject } from './contexts/ProjectContext'; // Import useProject

const { Sider, Content } = Layout;

export default function App() {
  const { isProjectOpen } = useProject(); // Use the hook to get project state

  const [selection, setSelection] = useState<{
    id: number | null;
    type: 'narrative' | 'world' | null;
  }>({ id: null, type: null });
  const [templateManagerVisible, setTemplateManagerVisible] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false); // State for settings modal
  const [isWizardVisible, setIsWizardVisible] = useState(false);

  useEffect(() => {
    const cleanupManager = window.electron.ipcRenderer.on(
      'open-template-manager',
      () => {
        setTemplateManagerVisible(true);
      },
    );

    const cleanupSettings = window.electron.ipcRenderer.on(
      'open-project-settings',
      () => {
        setShowSettingsModal(true);
      },
    );

    const cleanupWizard = window.electron.ipcRenderer.on(
      'open-project-wizard',
      () => {
        setIsWizardVisible(true);
      },
    );

    // If project is closed, clear selection
    if (!isProjectOpen) {
      setSelection({ id: null, type: null });
    }

    return () => {
      cleanupManager();
      cleanupSettings();
      cleanupWizard();
    };
  }, [isProjectOpen]); // Rerun effect when isProjectOpen changes

  const handleNarrativeSelect = (id: number | null) => {
    setSelection({ id, type: 'narrative' });
  };

  const handleWorldObjectSelect = (key: string | null) => {
    setSelection({ id: key ? parseInt(key, 10) : null, type: 'world' });
  };

  const handleCreateProject = async (values: any) => {
    try {
      await window.electron.project.create(values);
      setIsWizardVisible(false);
      notification.success({
        message: 'Проект создан',
        description: `Проект "${values.projectName}" успешно создан.`,
      });
    } catch (error: any) {
      console.error('Failed to create project:', error);
      notification.error({
        message: 'Ошибка при создании проекта',
        description: error.message || 'Произошла неизвестная ошибка.',
      });
    }
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={250} theme="light" style={{ overflowY: 'auto' }}>
        {isProjectOpen ? ( // Use isProjectOpen from context
          <>
            <NarrativeTree onSelect={handleNarrativeSelect} />
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
      <ProjectSettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      <ProjectWizardModal
        visible={isWizardVisible}
        onClose={() => setIsWizardVisible(false)}
        onCreate={handleCreateProject}
      />
    </Layout>
  );
}
