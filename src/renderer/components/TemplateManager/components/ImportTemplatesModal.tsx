import { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal, Button, Empty, Segmented, Checkbox, Space } from 'antd';
import {
  PredefinedTemplate,
  ExportFile, // Import ExportFile
  ExportedWorldObject, // Import ExportedWorldObject
  ExportedConnection, // Import ExportedConnection
  PredefinedWorldTemplate, // Import PredefinedWorldTemplate
} from '../../../../common/types';
import TemplateImportCard from './TemplateImportCard';
import notificationService from '../../../services/notificationService';

interface ImportTemplatesModalProps {
  visible: boolean;
  onClose: () => void;
  templatesToImport: PredefinedTemplate[];
  initialImportData?: string; // New prop: raw JSON string from file import
  onImport: (
    selectedTemplates: PredefinedTemplate[],
    shouldImportWorldObjects: boolean,
    shouldImportConnections: boolean,
    worldObjects: ExportedWorldObject[],
    connections: ExportedConnection[],
  ) => void;
}

const ImportTemplatesModal = ({
  visible,
  onClose,
  templatesToImport,
  onImport,
  initialImportData, // Destructure new prop
}: ImportTemplatesModalProps) => {
  const [selectedTemplateNames, setSelectedTemplateNames] = useState<string[]>(
    [],
  );
  const [filter, setFilter] = useState<'all' | 'selected'>('all');

  const [parsedExportFile, setParsedExportFile] = useState<ExportFile | null>(
    null,
  );
  const [fileTemplatesToDisplay, setFileTemplatesToDisplay] = useState<
    PredefinedWorldTemplate[]
  >([]);
  const [parsedWorldObjects, setParsedWorldObjects] = useState<
    ExportedWorldObject[]
  >([]);
  const [parsedConnections, setParsedConnections] = useState<
    ExportedConnection[]
  >([]);
  const [shouldImportObjects, setShouldImportObjects] = useState(false);
  const [shouldImportConnections, setShouldImportConnections] = useState(false);

  useEffect(() => {
    if (visible && initialImportData) {
      try {
        const parsedData: ExportFile = JSON.parse(initialImportData);
        // Basic validation
        if (
          parsedData.version &&
          parsedData.worldObjects &&
          parsedData.connections &&
          parsedData.templates?.world_templates
        ) {
          setParsedExportFile(parsedData);
          setFileTemplatesToDisplay(parsedData.templates.world_templates);
          setParsedWorldObjects(parsedData.worldObjects);
          setParsedConnections(parsedData.connections);

          // Default to importing objects and connections if they exist in the file
          setShouldImportObjects(parsedData.worldObjects.length > 0);
          setShouldImportConnections(parsedData.connections.length > 0);
        } else {
          notificationService.showError(
            'Ошибка импорта',
            'Неверный формат файла экспорта. Проверьте содержимое файла.',
          );
          onClose(); // Close modal if file is invalid
        }
      } catch (error) {
        notificationService.showError(
          'Ошибка импорта',
          `Не удалось разобрать содержимое файла импорта: ${error}`,
        );
        onClose(); // Close modal on parse error
      }
    } else if (!visible) {
      // Reset all states when modal is closed or switching from file import to library import
      setSelectedTemplateNames([]);
      setFilter('all');
      setParsedExportFile(null);
      setFileTemplatesToDisplay([]);
      setParsedWorldObjects([]);
      setParsedConnections([]);
      setShouldImportObjects(false);
      setShouldImportConnections(false);
    }
  }, [visible, initialImportData, onClose]); // onClose added to dependencies

  const currentTemplatesSource = useMemo(() => {
    return initialImportData ? fileTemplatesToDisplay : templatesToImport;
  }, [initialImportData, fileTemplatesToDisplay, templatesToImport]);

  const handleToggleSelection = useCallback((templateName: string) => {
    setSelectedTemplateNames((prev) =>
      prev.includes(templateName)
        ? prev.filter((name) => name !== templateName)
        : [...prev, templateName],
    );
  }, []); // Empty dependency array as setSelectedTemplateNames is stable
  const handleImport = () => {
    const selected = currentTemplatesSource.filter((t) =>
      selectedTemplateNames.includes(t.name),
    );
    onImport(
      selected,
      shouldImportObjects,
      shouldImportConnections,
      parsedWorldObjects,
      parsedConnections,
    );
    onClose();
  };

  const filteredTemplates = useMemo(() => {
    if (filter === 'selected') {
      return currentTemplatesSource.filter((t) =>
        selectedTemplateNames.includes(t.name),
      );
    }
    return currentTemplatesSource;
  }, [filter, currentTemplatesSource, selectedTemplateNames]);

  return (
    <Modal
      title={
        initialImportData ? 'Импорт из файла' : 'Импорт шаблонов из библиотеки'
      }
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
          disabled={selectedTemplateNames.length === 0 && !shouldImportObjects} // Disable if no templates or objects selected
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
        <Button
          onClick={() =>
            setSelectedTemplateNames(currentTemplatesSource.map((t) => t.name))
          }
          style={{ marginLeft: 8 }}
        >
          Выбрать все
        </Button>
      </div>

      {parsedExportFile && ( // Only show object/connection options for file import
        <Space direction="vertical" style={{ marginTop: 16 }}>
          {parsedWorldObjects.length > 0 && (
            <Checkbox
              checked={shouldImportObjects}
              onChange={(e) => setShouldImportObjects(e.target.checked)}
            >
              Импортировать объекты мира ({parsedWorldObjects.length} шт.)
            </Checkbox>
          )}
          {parsedConnections.length > 0 && (
            <Checkbox
              checked={shouldImportConnections}
              onChange={(e) => setShouldImportConnections(e.target.checked)}
              disabled={!shouldImportObjects} // Connections depend on objects
            >
              Импортировать связи ({parsedConnections.length} шт.)
            </Checkbox>
          )}
        </Space>
      )}
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
