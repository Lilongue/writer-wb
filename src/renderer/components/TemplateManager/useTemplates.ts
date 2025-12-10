/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { EntityTemplate } from '../../../common/types';
import { useProject } from '../../contexts/ProjectContext'; // Import useProject

const useTemplates = (category: string) => {
  const { isProjectOpen } = useProject(); // Get isProjectOpen from context
  const [templates, setTemplates] = useState<EntityTemplate[]>([]);
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
  }, [fetchTemplates]);

  const handleArchive = useCallback(
    async (id: number) => {
      const result = (await window.electron.ipcRenderer.invoke(
        'templates:archive',
        id,
      )) as { success: boolean; error?: string };
      if (result.success) {
        message.success('Template archived');
        fetchTemplates();
      } else {
        message.error(result.error);
      }
    },
    [fetchTemplates],
  );

  return {
    templates,
    includeArchived,
    setIncludeArchived,
    loading,
    fetchTemplates,
    handleArchive,
  };
};

export default useTemplates;
