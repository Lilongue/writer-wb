import React, { useState, useMemo } from 'react';
import { Modal, Button, Layout, List, Checkbox, Empty } from 'antd';
import { PredefinedTemplate } from '../../../../common/types';

const { Sider, Content } = Layout;

interface ImportTemplatesModalProps {
  visible: boolean;
  onClose: () => void;
  templatesToImport: PredefinedTemplate[];
  onImport: (selectedTemplates: PredefinedTemplate[]) => void;
}

const ImportTemplatesModal = ({
  visible,
  onClose,
  templatesToImport,
  onImport,
}: ImportTemplatesModalProps) => {
  const [selectedTemplateNames, setSelectedTemplateNames] = useState<string[]>(
    [],
  );
  const [focusedTemplateName, setFocusedTemplateName] = useState<string | null>(
    null,
  );

  const handleToggleSelection = (templateName: string) => {
    setSelectedTemplateNames((prev) =>
      prev.includes(templateName)
        ? prev.filter((name) => name !== templateName)
        : [...prev, templateName],
    );
  };

  const handleImport = () => {
    const selected = templatesToImport.filter((t) =>
      selectedTemplateNames.includes(t.name),
    );
    onImport(selected);
  };

  const focusedTemplate = useMemo(() => {
    if (!focusedTemplateName) return null;
    return (
      templatesToImport.find((t) => t.name === focusedTemplateName) || null
    );
  }, [focusedTemplateName, templatesToImport]);

  return (
    <Modal
      title="Import Templates from Library"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="import"
          type="primary"
          disabled={selectedTemplateNames.length === 0}
          onClick={handleImport}
        >
          Import Selected
        </Button>,
      ]}
    >
      <Layout className="import-modal-layout">
        <Sider className="import-modal-sider">
          <List
            header={<div>Available Templates</div>}
            bordered
            dataSource={templatesToImport}
            renderItem={(template) => (
              <List.Item
                onClick={() => setFocusedTemplateName(template.name)}
                className={`template-list-item ${
                  focusedTemplateName === template.name
                    ? 'template-list-item-focused'
                    : ''
                }`}
              >
                <Checkbox
                  checked={selectedTemplateNames.includes(template.name)}
                  onChange={() => handleToggleSelection(template.name)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="template-list-item-label">
                  {template.name}
                </span>
              </List.Item>
            )}
            className="template-list-container"
          />
        </Sider>
        <Content className="import-modal-content">
          {focusedTemplate ? (
            <List
              header={<div>Fields for &quot;{focusedTemplate.name}&quot;</div>}
              bordered
              dataSource={focusedTemplate.fields}
              renderItem={(field) => (
                <List.Item>
                  <List.Item.Meta
                    title={field.label}
                    description={field.comment}
                  />
                </List.Item>
              )}
              className="template-list-container"
            />
          ) : (
            <div className="empty-details-pane">
              <Empty description="Select a template to see its fields" />
            </div>
          )}
        </Content>
      </Layout>
    </Modal>
  );
};

export default ImportTemplatesModal;
