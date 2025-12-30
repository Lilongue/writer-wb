/* eslint-disable no-console */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ItemDetails } from '../../../common/types';

interface UseItemDetailsProps {
  selectedId: number | null;
  selectedType: 'narrative' | 'world' | null;
}

// Utility function (can be moved to a separate file if reused)
const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const useItemDetails = ({ selectedId, selectedType }: UseItemDetailsProps) => {
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const fetchDetails = useCallback(() => {
    if (selectedId && selectedType) {
      setLoading(true);
      return window.electron.ipcRenderer
        .invoke('get-item-details', { id: selectedId, type: selectedType })
        .then((result: unknown) => {
          setDetails(result as ItemDetails | null);
          return result as ItemDetails | null;
        })
        .catch((err) => {
          console.error(err);
          return null;
        })
        .finally(() => setLoading(false));
    }
    setDetails(null);
    return null;
  }, [selectedId, selectedType]);

  const handleSearch = useCallback(
    (query: string) => {
      if (query && details) {
        window.electron.ipcRenderer
          .invoke('entities:search', { query, currentEntityId: details.id })
          .then((result: unknown) => setSearchResults(result as any[]))
          .catch(console.error);
      } else {
        setSearchResults([]);
      }
    },
    [details],
  );

  const debouncedSearch = useMemo(
    () => debounce(handleSearch, 300),
    [handleSearch],
  );

  const handleAddConnection = useCallback(
    (values: any) => {
      if (!details || !selectedType) return;

      const target = JSON.parse(values.target);

      window.electron.ipcRenderer
        .invoke('connections:create', {
          sourceType: selectedType,
          sourceId: details.id,
          targetType: target.type,
          targetId: target.id,
          description: values.description || '',
        })
        .then(() => {
          fetchDetails();
          return null;
        })
        .catch(console.error);
    },
    [details, selectedType, fetchDetails],
  );

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (!details?.path || !details.fileExists) {
      return () => {};
    }

    const intervalId = setInterval(() => {
      window.electron.ipcRenderer
        .invoke('fs-stat', details.path)
        .then((stats: unknown) => {
          const fileStats = stats as { mtimeMs: number } | null;
          if (fileStats && details.mtime !== fileStats.mtimeMs) {
            console.log('File changed on poll, reloading...', details.path);
            fetchDetails();
          }
          return null;
        })
        .catch(console.error);
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [details, fetchDetails]);

  const handleOpenFile = useCallback(() => {
    if (details?.path && details?.fileExists) {
      window.electron.ipcRenderer.sendMessage(
        'open-in-external-editor',
        details.path,
      );
    }
  }, [details]);

  const handleCreateFile = useCallback(() => {
    if (details?.path) {
      setLoading(true);
      return window.electron.ipcRenderer
        .invoke('create-file', details.path)
        .then((result: unknown) => {
          const createFileResult = result as { success: boolean };
          if (createFileResult.success) {
            fetchDetails();
          }
          return createFileResult;
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    return Promise.resolve();
  }, [details, fetchDetails]);

  const handleDeleteConnection = useCallback(
    (connectionId: number) => {
      window.electron.ipcRenderer
        .invoke('connections:delete', connectionId)
        .then(() => fetchDetails())
        .catch(console.error);
    },
    [fetchDetails],
  );

  return {
    details,
    loading,
    searchResults,
    fetchDetails,
    debouncedSearch,
    handleAddConnection,
    handleOpenFile,
    handleCreateFile,
    handleDeleteConnection,
  };
};

export default useItemDetails;
