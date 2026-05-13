/* eslint-disable no-console */
import { useState, useEffect } from 'react';
import { Modal, Button, List, Checkbox, Space } from 'antd';
import useTemplates from './useTemplates';
import {
  PredefinedTemplate,
  ExportedWorldObject,
  ExportedConnection,
  EntityType,
} from '../../../common/types';
import TemplateEditorModal, {
  TemplateEditModalState,
} from './components/TemplateEditorModal';
import ImportTemplatesModal from './components/ImportTemplatesModal';

function TemplateManagerModal({
  visible,
  onClose,
  initialImportData, // Add new prop
}: {
  visible: boolean;
  onClose: () => void;
  initialImportData?: string; // Add to props interface
}) {
  const {
    templates,
    predefinedTemplates,
    includeArchived,
    setIncludeArchived,
    loading,
    fetchTemplates,
    handleToggleVisibility,
    handleBulkImport,
  } = useTemplates('world'); // Assuming category 'world'

  const [editModalState, setEditModalState] = useState<TemplateEditModalState>({
    open: false,
    mode: 'create',
    template: null,
  });

  const [isImportModalVisible, setImportModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchTemplates();
      // If initialImportData is present, open the import modal immediately
      if (initialImportData) {
        setImportModalVisible(true);
      }
    }
  }, [visible, fetchTemplates, initialImportData]); // Add initialImportData to dependencies

  const handleEditModalSave = async (values: any) => {
    const { mode, template } = editModalState;

    try {
      if (mode === 'create' || mode === 'copy') {
        await window.electron.ipcRenderer.invoke('templates:create', {
          name: values.name,
          category: 'world',
          fields: values.fields || [],
        });
      } else if (mode === 'edit' && template) {
        if (template.name !== values.name) {
          await window.electron.ipcRenderer.invoke('templates:rename', {
            id: template.id,
            newName: values.name,
          });
        }
        await window.electron.ipcRenderer.invoke('templates:updateSchema', {
          id: template.id,
          schema: values.fields || [],
        });
      }
      fetchTemplates();
      window.electron.ipcRenderer.sendMessage('world-objects-changed');
    } catch (errorInfo) {
      console.error('Failed:', errorInfo);
    }
  };

  const existingTemplateNames = templates.map((t) => t.name);
  const availableToImport = predefinedTemplates.filter(
    (pt) => !existingTemplateNames.includes(pt.name),
  );

  const onTemplatesImport = (selectedTemplates: any[]) => {
    handleBulkImport(selectedTemplates);
    setImportModalVisible(false); // Close only sub-modal
  };

  const onImportFromFile = async (
    selectedTemplates: PredefinedTemplate[],
    shouldImportWorldObjects: boolean,
    shouldImportConnections: boolean,
    worldObjects: ExportedWorldObject[],
    connections: ExportedConnection[],
  ) => {
    try {
      await window.electron.ipcRenderer.invoke('import:from-file', {
        selectedTemplates,
        shouldImportWorldObjects,
        shouldImportConnections,
        worldObjectsToImport: worldObjects,
        connectionsToImport: connections,
      });
      fetchTemplates();
      window.electron.ipcRenderer.sendMessage('world-objects-changed');
    } catch (error) {
      console.error('File import failed:', error);
    }
    onClose(); // Close the entire manager
  };

  const isFileImportFlow = !!initialImportData;

  return (
    <Modal
      title="Менеджер шаблонов"
      open={visible}
      onCancel={onClose}
      closable={false}
      footer={[
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>,
      ]}
      width={800}
    >
      <Checkbox
        checked={includeArchived}
        onChange={(e) => setIncludeArchived(e.target.checked)}
      >
        Показывать архивные
      </Checkbox>
      <Button
        onClick={() =>
          setEditModalState({
            open: true,
            mode: 'create',
            template: { category: EntityType.WorldObject },
          })
        }
        style={{ marginLeft: 16 }}
      >
        Создать
      </Button>
      <Button
        style={{ marginLeft: 8 }}
        disabled={availableToImport.length === 0 && !initialImportData}
        onClick={() => setImportModalVisible(true)}
      >
        Импорт
      </Button>
      <List
        loading={loading}
        dataSource={templates}
        renderItem={(template) => (
          <List.Item
            actions={[
              <Space key="action-buttons">
                <Button
                  onClick={() =>
                    setEditModalState({ open: true, mode: 'copy', template })
                  }
                >
                  Дублировать
                </Button>
                <Button
                  onClick={() =>
                    setEditModalState({
                      open: true,
                      mode: 'edit',
                      template,
                    })
                  }
                >
                  Редактировать
                </Button>
                <Button
                  danger={template.is_visible}
                  onClick={() => handleToggleVisibility(template.id)}
                >
                  {template.is_visible ? 'В архив' : 'Восстановить'}
                </Button>
              </Space>,
            ]}
          >
            <List.Item.Meta
              title={`${template.name}${template.is_visible ? '' : ' (в архиве)'}`}
              description={`Поля: ${
                JSON.parse(template.fields_schema || '[]')
                  .map((f: any) => f.label)
                  .join(', ') || 'Нет'
              }`}
            />
          </List.Item>
        )}
      />
      {/* Edit/Create Modal */}
      <TemplateEditorModal
        editModalState={editModalState}
        onClose={() =>
          setEditModalState({ open: false, mode: 'create', template: null })
        }
        onSave={handleEditModalSave}
      />
      {isImportModalVisible && (
        <ImportTemplatesModal
          visible={isImportModalVisible}
          templatesToImport={availableToImport}
          initialImportData={initialImportData}
          onClose={() => {
            setImportModalVisible(false);
          }}
          onImport={
            isFileImportFlow
              ? async (...args) => {
                  await onImportFromFile(...args);
                }
              : (selected) => {
                  onTemplatesImport(selected);
                }
          }
        />
      )}
    </Modal>
  );
}

export default TemplateManagerModal;
