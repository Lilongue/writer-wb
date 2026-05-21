import React, { useState, useEffect, useRef } from 'react';
import { Button, List, Collapse, Typography } from 'antd';
import notificationService from '../../../services/notificationService';
import pollingService from '../../../services/PollingService';

interface AttachedFilesProps {
  folderPath: string | null;
  onOpenFile: (fileName: string) => void;
}

const areFileListsEqual = (listA: string[], listB: string[]): boolean => {
  if (listA.length !== listB.length) {
    return false;
  }
  const sortedA = [...listA].sort();
  const sortedB = [...listB].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
};

const AttachedFiles: React.FC<AttachedFilesProps> = ({
  folderPath,
  onOpenFile,
}) => {
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const attachedFilesRef = useRef(attachedFiles);

  useEffect(() => {
    attachedFilesRef.current = attachedFiles;
  }, [attachedFiles]);

  useEffect(() => {
    const fetchFiles = async () => {
      if (folderPath) {
        setLoading(true);
        try {
          const files = await window.electron.fs.getDirectoryFiles(folderPath);
          setAttachedFiles(files);
        } catch (error) {
          notificationService.showError(
            'Ошибка загрузки дополнительных файлов',
            String(error),
          );
        } finally {
          setLoading(false);
        }
      } else {
        setAttachedFiles([]);
      }
    };

    fetchFiles();

    if (!folderPath) {
      pollingService.stopDirectoryPolling();
      return () => {};
    }

    const pollCallback = () => {
      window.electron.fs
        .readdir(folderPath)
        .then((result) => {
          if (result.success) {
            // Сравниваем, чтобы избежать ненужных перерисовок
            if (!areFileListsEqual(result.files, attachedFilesRef.current)) {
              setAttachedFiles(result.files);
            }
          }
          return null;
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Error polling for attached files:', error);
        });
    };

    pollingService.startDirectoryPolling(pollCallback);

    return () => {
      pollingService.stopDirectoryPolling();
    };
  }, [folderPath]);

  if (!folderPath || loading || attachedFiles.length === 0) {
    return null;
  }

  return (
    <Collapse style={{ marginBottom: '24px' }}>
      <Collapse.Panel
        header={
          <div className="uniform-collapse-header">
            <Typography.Text strong>
              {`Дополнительные файлы (${attachedFiles.length})`}
            </Typography.Text>
          </div>
        }
        key="1"
      >
        <List
          size="small"
          dataSource={attachedFiles}
          renderItem={(item) => (
            <List.Item>
              <Button type="link" onClick={() => onOpenFile(item)}>
                {item}
              </Button>
            </List.Item>
          )}
          locale={{ emptyText: 'Нет дополнительных файлов' }}
        />
      </Collapse.Panel>
    </Collapse>
  );
};

export default AttachedFiles;
