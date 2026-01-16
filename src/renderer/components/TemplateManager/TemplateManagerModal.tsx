/* eslint-disable no-console */
import { useState, useEffect } from 'react';
import { Modal, Button, List, Checkbox } from 'antd';
import useTemplates from './useTemplates';
import TemplateEditorModal, {
  TemplateEditModalState,
} from './components/TemplateEditorModal';
import ImportTemplatesModal from './components/ImportTemplatesModal';

function TemplateManagerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const {
    templates,
    predefinedTemplates,
    includeArchived,
    setIncludeArchived,
    loading,
    fetchTemplates,
    handleArchive,
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
    }
  }, [visible, fetchTemplates]);

  const handleEditModalSave = async (values: any) => {
    const { mode, template } = editModalState;

    try {
      if (mode === 'create' || mode === 'copy') {
        await window.electron.ipcRenderer.invoke('templates:create', {
          name: values.name,
          category: 'world',
          fields: values.fields || [],
        });
      } else if (mode === 'rename' && template) {
        await window.electron.ipcRenderer.invoke('templates:rename', {
          id: template.id,
          newName: values.name,
        });
      } else if (mode === 'edit-fields' && template) {
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
    setImportModalVisible(false);
  };

  return (
    <Modal
      title="Template Manager"
      open={visible}
      onCancel={onClose}
      closable={false}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={800}
    >
      <Checkbox
        checked={includeArchived}
        onChange={(e) => setIncludeArchived(e.target.checked)}
      >
        Show Archived
      </Checkbox>
      <Button
        onClick={() =>
          setEditModalState({
            open: true,
            mode: 'create',
            template: { category: 'world' },
          })
        }
        style={{ marginLeft: 16 }}
      >
        Create New
      </Button>
      <Button
        style={{ marginLeft: 8 }}
        disabled={availableToImport.length === 0}
        onClick={() => setImportModalVisible(true)}
      >
        Import from Library
      </Button>
      <List
        loading={loading}
        dataSource={templates}
        renderItem={(template) => (
          <List.Item
            actions={[
              <Button
                key="copy"
                onClick={() =>
                  setEditModalState({ open: true, mode: 'copy', template })
                }
              >
                Copy
              </Button>,
              <Button
                key="rename"
                onClick={() =>
                  setEditModalState({ open: true, mode: 'rename', template })
                }
              >
                Rename
              </Button>,
              <Button
                key="edit-fields"
                onClick={() =>
                  setEditModalState({
                    open: true,
                    mode: 'edit-fields',
                    template,
                  })
                }
              >
                Edit Fields
              </Button>,
              !template.is_visible ? null : (
                <Button
                  key="archive"
                  danger
                  onClick={() => handleArchive(template.id)}
                >
                  Archive
                </Button>
              ),
            ]}
          >
            <List.Item.Meta
              title={`${template.name}${template.is_visible ? '' : ' (Archived)'}`}
              description={`Fields: ${
                JSON.parse(template.fields_schema || '[]')
                  .map((f: any) => f.label)
                  .join(', ') || 'None'
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
          onClose={() => setImportModalVisible(false)}
          onImport={onTemplatesImport}
        />
      )}
    </Modal>
  );
}

export default TemplateManagerModal;
