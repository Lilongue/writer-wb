/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { EntityTemplate } from '../../../common/types';

const useTemplates = (category: string) => {
  const [templates, setTemplates] = useState<EntityTemplate[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const result = (await window.electron.ipcRenderer.invoke(
        'templates:getAll',
        includeArchived,
        category,
      )) as EntityTemplate[];
      setTemplates(result);
    } catch (_) {
      message.error('Failed to load templates');
    }
    setLoading(false);
  }, [includeArchived, category]);

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
