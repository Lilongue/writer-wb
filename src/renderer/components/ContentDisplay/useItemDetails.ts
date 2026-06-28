import { useCallback, useEffect, useMemo, useState } from 'react';
import { EntityType, ItemDetails, ResolvedEntity } from '../../../common/types';
import notificationService from '../../services/notificationService';
import pollingService from '../../services/PollingService';

interface UseItemDetailsProps {
  selectedId: number | null;
  selectedType: EntityType | null;
}

// Utility function (can be moved to a separate file if reused)
const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const getDirname = (filePath: string): string => {
  if (!filePath) return '';
  const lastSlash = filePath.lastIndexOf('/');
  const lastBackslash = filePath.lastIndexOf('\\');
  const index = Math.max(lastSlash, lastBackslash);
  if (index === -1) {
    return '';
  }
  return filePath.substring(0, index);
};

const useItemDetails = ({ selectedId, selectedType }: UseItemDetailsProps) => {
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ResolvedEntity[]>([]);

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
          notificationService.showError(
            'Ошибка загрузки деталей элемента',
            String(err),
          );
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
          .invoke('entities:search', {
            query,
            currentEntity: { id: details.id, type: selectedType },
          })
          .then((result: unknown) =>
            setSearchResults(result as ResolvedEntity[]),
          )
          .catch((error) =>
            notificationService.showError(
              'Ошибка поиска сущностей',
              String(error),
            ),
          );
      } else {
        setSearchResults([]);
      }
    },
    [details, selectedType],
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
        .catch((error) =>
          notificationService.showError(
            'Ошибка добавления связи',
            String(error),
          ),
        );
    },
    [details, selectedType, fetchDetails],
  );

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (!details?.path || !details.fileExists) {
      pollingService.stopFilePolling();
      return;
    }
    const pollCallback = () => {
      window.electron.ipcRenderer
        .invoke('fs-stat', details.path)
        .then((stats: unknown) => {
          const fileStats = stats as { mtimeMs: number } | null;
          if (fileStats && details.mtime !== fileStats.mtimeMs) {
            fetchDetails();
          }
          return null;
        })
        .catch((error) =>
          notificationService.showError(
            'Ошибка чтения статистики файла',
            String(error),
          ),
        );
    };
    pollingService.startFilePolling(pollCallback);
    pollingService.stopFilePolling();
  }, [details, fetchDetails]);

  const handleOpenFile = useCallback(() => {
    if (details?.path && details?.fileExists) {
      window.electron.ipcRenderer
        .invoke('open-in-external-editor', details.path)
        .catch((error) =>
          notificationService.showError(
            'Ошибка открытия файла во внешнем редакторе',
            String(error),
          ),
        );
    }
  }, [details]);

  const handleOpenAttachedFile = useCallback(
    (fileName: string) => {
      if (details?.path) {
        const folderPath = getDirname(details.path);
        const sep = folderPath.includes('\\') ? '\\' : '/';
        const fullPath = `${folderPath}${sep}${fileName}`;

        window.electron.ipcRenderer
          .invoke('open-in-external-editor', fullPath)
          .catch((error) =>
            notificationService.showError(
              'Ошибка открытия файла во внешнем редакторе',
              String(error),
            ),
          );
      }
    },
    [details],
  );

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
        .catch((error) =>
          notificationService.showError('Ошибка создания файла', String(error)),
        )
        .finally(() => setLoading(false));
    }
    return Promise.resolve();
  }, [details, fetchDetails]);

  const handleDeleteConnection = useCallback(
    (connectionId: number) => {
      window.electron.ipcRenderer
        .invoke('connections:delete', connectionId)
        .then(() => fetchDetails())
        .catch((error) =>
          notificationService.showError('Ошибка удаления связи', String(error)),
        );
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
    handleOpenAttachedFile,
    handleCreateFile,
    handleDeleteConnection,
  };
};

export default useItemDetails;
