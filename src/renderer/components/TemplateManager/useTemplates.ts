import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { EntityTemplate, PredefinedTemplate } from '../../../common/types';
import { useProject } from '../../contexts/ProjectContext'; // Import useProject
import notificationService from '../../services/notificationService';

const useTemplates = (category: string) => {
  const { isProjectOpen } = useProject(); // Get isProjectOpen from context
  const [templates, setTemplates] = useState<EntityTemplate[]>([]);
  const [predefinedTemplates, setPredefinedTemplates] = useState<
    PredefinedTemplate[]
  >([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    // Only fetch if a project is open
    if (!isProjectOpen) {
      setTemplates([]); // Clear templates if project is closed
      return;
    }

    setLoading(true);
    try {
      const result = (await window.electron.ipcRenderer.invoke(
        'templates:getAll',
        includeArchived,
        category,
      )) as EntityTemplate[];
      setTemplates(result);
    } catch (err) {
      message.error(`Failed to load templates ${err}`);
    }
    setLoading(false);
  }, [includeArchived, category, isProjectOpen]); // Add isProjectOpen to dependencies

  useEffect(() => {
    fetchTemplates();

    const removeListener = window.electron.ipcRenderer.on(
      'templates-changed',
      () => {
        fetchTemplates();
      },
    );

    return () => {
      removeListener();
    };
  }, [fetchTemplates]);

  useEffect(() => {
    if (isProjectOpen) {
      window.electron.template
        .getPredefinedTemplates()
        .then((pTemplates) => {
          setPredefinedTemplates(pTemplates);
          return null;
        })
        .catch((err) => {
          notificationService.showError(
            'Ошибка загрузки предустановленных шаблонов',
            err,
          );
          message.error('Failed to load predefined templates');
        });
    }
  }, [isProjectOpen]);

  const handleToggleVisibility = useCallback(
    async (id: number) => {
      const result = (await window.electron.ipcRenderer.invoke(
        'templates:toggleVisibility',
        id,
      )) as { success: boolean; error?: string };
      if (result.success) {
        message.success('Template status updated');
        fetchTemplates();
        window.electron.ipcRenderer.sendMessage('world-objects-changed');
      } else {
        message.error(result.error);
      }
    },
    [fetchTemplates],
  );

  const handleImportTemplate = useCallback(
    async (template: PredefinedTemplate) => {
      try {
        await window.electron.template.importTemplate(template);
        message.success(`Template "${template.name}" imported`);
        fetchTemplates();
        window.electron.ipcRenderer.sendMessage('world-objects-changed');
      } catch (err) {
        notificationService.showError('Ошибка импорта шаблона', String(err));
      }
    },
    [fetchTemplates],
  );

  const handleBulkImport = useCallback(
    async (templatesToImport: PredefinedTemplate[]) => {
      if (templatesToImport.length === 0) return;

      try {
        await Promise.all(
          templatesToImport.map((template) =>
            window.electron.template.importTemplate(template),
          ),
        );

        message.success(
          `Successfully imported ${templatesToImport.length} templates.`,
        );
        fetchTemplates();
        window.electron.ipcRenderer.sendMessage('world-objects-changed');
      } catch (err) {
        notificationService.showError('Ошибка импорта шаблонов', String(err));
      }
    },
    [fetchTemplates],
  );

  return {
    templates,
    predefinedTemplates,
    includeArchived,
    setIncludeArchived,
    loading,
    fetchTemplates,
    handleToggleVisibility,
    handleImportTemplate,
    handleBulkImport,
  };
};

export default useTemplates;
