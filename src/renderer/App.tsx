/* eslint-disable no-console */
import { useState, useEffect, useRef } from 'react';
import 'antd/dist/reset.css';
import './App.css';
import 'rc-tree/assets/index.css';
import { Layout, Empty, notification, message } from 'antd';
import NarrativeTree from './components/NarrativeTree';
import WorldObjectTree from './components/WorldObjectTree';
import ContentDisplay from './components/ContentDisplay';
import TemplateManagerModal from './components/TemplateManager';
import ProjectSettingsModal from './components/ProjectSettingsModal'; // Import ProjectSettingsModal
import ProjectWizardModal from './components/ProjectWizardModal';
import { useProject } from './contexts/ProjectContext'; // Import useProject
import notificationService, { apiHolder } from './services/notificationService';
import ErrorBoundary from './components/ErrorBoundary';
import { EntityType, NotificationType } from '../common/types';
import { ContentDisplayRef } from './components/ContentDisplay/ContentDisplay';

const { Sider, Content } = Layout;

export default function App() {
  const { isProjectOpen } = useProject(); // Use the hook to get project state
  const [notificationApi, notificationContextHolder] =
    notification.useNotification();
  const [messageApi, messageContextHolder] = message.useMessage();

  const contentDisplayRef = useRef<ContentDisplayRef>(null);

  useEffect(() => {
    // Make APIs available to the service
    apiHolder.notification = notificationApi;
    apiHolder.message = messageApi;
  }, [notificationApi, messageApi]);

  const [selection, setSelection] = useState<{
    id: number | null;
    type: EntityType | null;
  }>({ id: null, type: null });
  const [templateManagerVisible, setTemplateManagerVisible] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false); // State for settings modal
  const [isWizardVisible, setIsWizardVisible] = useState(false);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      notificationService.showError(
        'Необработанная ошибка',
        event.reason?.message ||
          'Произошла асинхронная ошибка. Проверьте консоль для деталей.',
      );
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

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

    const cleanupNotification = window.electron.ipcRenderer.on(
      'show-notification',
      (arg: any) => {
        const { type, title, content } = arg as {
          type: NotificationType;
          title: string;
          content?: string;
        };

        switch (type) {
          case NotificationType.Error:
            notificationService.showError(title, content);
            break;
          case NotificationType.Warning:
            notificationService.showWarning(title);
            break;
          case NotificationType.Info:
            notificationService.showInfo(title);
            break;
          case NotificationType.Success:
            notificationService.showSuccess(title);
            break;
          default:
            // eslint-disable-next-line no-console
            console.error(`Unknown notification type: ${type}`);
        }
      },
    );

    // If project is closed, clear selection
    if (!isProjectOpen) {
      setSelection({ id: null, type: null });
    }

    return () => {
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection,
      );
      cleanupManager();
      cleanupSettings();
      cleanupWizard();
      cleanupNotification();
    };
  }, [isProjectOpen]); // Rerun effect when isProjectOpen changes

  const handleSelect = async (id: number | null, type: EntityType | null) => {
    // Do nothing if the selection hasn't changed
    if (id === selection.id && type === selection.type) {
      return;
    }

    try {
      // Await saving of any pending changes before changing the selection
      await contentDisplayRef.current?.save();
      // If save is successful (or not needed), update the selection
      setSelection({ id, type });
    } catch (error) {
      console.error('Failed to save before switching:', error);
      // Optionally notify the user that the switch was aborted due to save failure
      notificationService.showError(
        'Не удалось сохранить изменения',
        'Переключение элемента было отменено, так как не удалось сохранить текущие изменения.',
      );
    }
  };

  const handleCreateProject = async (values: any) => {
    try {
      await window.electron.project.create(values);
      setIsWizardVisible(false);
      notificationService.showSuccess(
        `Проект "${values.projectName}" успешно создан.`,
      );
    } catch (error: any) {
      console.error('Failed to create project:', error);
      notificationService.showError(
        'Ошибка при создании проекта',
        error.message || 'Произошла неизвестная ошибка.',
      );
    }
  };

  return (
    <ErrorBoundary>
      {notificationContextHolder}
      {messageContextHolder}
      <Layout style={{ height: '100vh' }}>
        <Sider width={250} theme="light" style={{ overflowY: 'auto' }}>
          {isProjectOpen ? ( // Use isProjectOpen from context
            <>
              <NarrativeTree
                onSelect={(id) => handleSelect(id, EntityType.Narrative)}
                selectedId={selection.id}
                selectedType={
                  selection.type === EntityType.Narrative
                    ? EntityType.Narrative
                    : null
                }
              />
              <WorldObjectTree
                onSelect={(key) =>
                  handleSelect(
                    key ? parseInt(key, 10) : null,
                    EntityType.WorldObject,
                  )
                }
                selectedId={selection.id}
                selectedType={
                  selection.type === EntityType.WorldObject
                    ? EntityType.WorldObject
                    : null
                }
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
            ref={contentDisplayRef}
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
    </ErrorBoundary>
  );
}
