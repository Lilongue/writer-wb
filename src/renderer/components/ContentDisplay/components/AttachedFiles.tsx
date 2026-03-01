import React, { useState, useEffect } from 'react';
import { Button, List, Collapse } from 'antd';
import notificationService from '../../../services/notificationService';

interface AttachedFilesProps {
  folderPath: string | null;
  onOpenFile: (fileName: string) => void;
}

const AttachedFiles: React.FC<AttachedFilesProps> = ({
  folderPath,
  onOpenFile,
}) => {
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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
  }, [folderPath]);

  if (!folderPath || loading || attachedFiles.length === 0) {
    return null;
  }

  return (
    <Collapse style={{ marginBottom: '24px' }}>
      <Collapse.Panel
        header={`Дополнительные файлы (${attachedFiles.length})`}
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
