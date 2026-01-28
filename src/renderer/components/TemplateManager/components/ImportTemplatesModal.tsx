import { useState, useMemo, useEffect } from 'react';
import { Modal, Button, Empty, Segmented } from 'antd';
import { PredefinedTemplate } from '../../../../common/types';
import TemplateImportCard from './TemplateImportCard';

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
  const [filter, setFilter] = useState<'all' | 'selected'>('all');

  useEffect(() => {
    // Reset state when modal is closed
    if (!visible) {
      setSelectedTemplateNames([]);
      setFilter('all');
    }
  }, [visible]);

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

  const filteredTemplates = useMemo(() => {
    if (filter === 'selected') {
      return templatesToImport.filter((t) =>
        selectedTemplateNames.includes(t.name),
      );
    }
    return templatesToImport;
  }, [filter, templatesToImport, selectedTemplateNames]);

  return (
    <Modal
      title="Импорт шаблонов из библиотеки"
      open={visible}
      onCancel={onClose}
      closable={false}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Отменить
        </Button>,
        <Button
          key="import"
          type="primary"
          disabled={selectedTemplateNames.length === 0}
          onClick={handleImport}
        >
          Импортировать выбранные
        </Button>,
      ]}
    >
      <div className="import-modal-controls">
        <Segmented
          options={[
            { label: 'Все', value: 'all' },
            {
              label: `Выбранные (${selectedTemplateNames.length})`,
              value: 'selected',
            },
          ]}
          value={filter}
          onChange={(value) => setFilter(value as 'all' | 'selected')}
        />
      </div>
      <div className="template-import-cards-container">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => (
            <TemplateImportCard
              key={template.name}
              template={template}
              selected={selectedTemplateNames.includes(template.name)}
              onSelect={handleToggleSelection}
            />
          ))
        ) : (
          <div className="empty-details-pane">
            <Empty
              description={
                filter === 'all'
                  ? 'Нет доступных шаблонов для импорта'
                  : 'Нет выбранных шаблонов'
              }
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportTemplatesModal;
