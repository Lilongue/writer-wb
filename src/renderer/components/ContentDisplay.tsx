/* eslint-disable no-console */
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Descriptions, Empty, Typography, Input } from 'antd';
import ReactMarkdown from 'react-markdown';
import { ItemDetails } from '../../common/types';

interface ContentDisplayProps {
  selectedId: number | null;
  selectedType: 'narrative' | 'world' | null;
}

function ContentDisplay({ selectedId, selectedType }: ContentDisplayProps) {
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [editedDetails, setEditedDetails] =
    useState<Partial<ItemDetails> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetails = useCallback(() => {
    if (selectedId && selectedType) {
      setLoading(true);
      return window.electron.ipcRenderer
        .invoke('get-item-details', { id: selectedId, type: selectedType })
        .then((result) => {
          setDetails(result);
          return result;
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    setDetails(null);
    return null;
  }, [selectedId, selectedType]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (details) {
      setEditedDetails({
        name: details.name,
        customFields: details.customFields,
      });
    }
  }, [details]);

  useEffect(() => {
    if (!details?.path || !details.fileExists) {
      return () => {}; // Ничего не делаем, если нет пути или файла
    }

    const intervalId = setInterval(() => {
      window.electron.ipcRenderer
        .invoke('fs-stat', details.path)
        .then((stats) => {
          if (stats && details.mtime !== stats.mtimeMs) {
            console.log('File changed on poll, reloading...', details.path);
            fetchDetails();
          }
          return null;
        })
        .catch(console.error);
    }, 2000); // Опрос каждые 2 секунды

    return () => {
      clearInterval(intervalId);
    };
  }, [details, fetchDetails]);

  const handleOpenFile = () => {
    if (details?.path && details?.fileExists) {
      window.electron.ipcRenderer.sendMessage(
        'open-in-external-editor',
        details.path,
      );
    }
  };

  const handleCreateFile = () => {
    if (details?.path) {
      setLoading(true);
      return window.electron.ipcRenderer
        .invoke('create-file', details.path)
        .then((result) => {
          if (result.success) {
            // Перезагружаем детали, чтобы показать пустой файл
            fetchDetails();
          }
          return result;
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    return Promise.resolve();
  };

  const handleFieldChange = (index: number, value: string) => {
    if (!editedDetails?.customFields) return;
    const newFields = [...editedDetails.customFields];
    newFields[index] = { ...newFields[index], value };
    setEditedDetails({ ...editedDetails, customFields: newFields });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedDetails({ ...editedDetails, name: e.target.value });
  };

  const handleSave = () => {
    if (!details || !editedDetails) return;

    // Собираем properties из отредактированных полей
    const properties =
      editedDetails.customFields?.reduce(
        (acc, field) => {
          acc[field.key] = field.value;
          return acc;
        },
        {} as Record<string, string>,
      ) || {};

    window.electron.ipcRenderer
      .invoke('world-object:update-details', {
        id: details.id,
        name: editedDetails.name,
        properties: JSON.stringify(properties),
      })
      .catch(console.error);
  };

  const isChanged =
    details &&
    editedDetails &&
    (details.name !== editedDetails.name ||
      JSON.stringify(details.customFields) !==
        JSON.stringify(editedDetails.customFields));

  if (!selectedId || !details || !editedDetails) {
    return (
      <div className="empty-details-container">
        <Empty description="Выберите элемент в дереве, чтобы увидеть детали" />
      </div>
    );
  }

  return (
    <Card
      loading={loading}
      title={
        <Input
          value={editedDetails.name}
          onChange={handleNameChange}
          disabled={selectedType !== 'world'}
        />
      }
      className="content-display-card"
      extra={
        <div className="card-extra-actions">
          <Button type="primary" onClick={handleSave} disabled={!isChanged}>
            Сохранить
          </Button>
          <Button
            onClick={handleOpenFile}
            disabled={!details.path || !details.fileExists}
          >
            Открыть во внешнем редакторе
          </Button>
        </div>
      }
    >
      {editedDetails.customFields && editedDetails.customFields.length > 0 && (
        <>
          <Descriptions bordered size="small" column={1}>
            {editedDetails.customFields.map((field, index) => (
              <Descriptions.Item key={field.label} label={field.label}>
                <Input
                  value={field.value}
                  onChange={(e) => handleFieldChange(index, e.target.value)}
                  disabled={selectedType !== 'world'}
                />
              </Descriptions.Item>
            ))}
          </Descriptions>
          <br />
        </>
      )}

      {details.fileExists ? (
        <Typography.Text>
          <ReactMarkdown>{details.content || ''}</ReactMarkdown>
        </Typography.Text>
      ) : (
        <div className="create-file-container">
          <Typography.Text type="secondary">{details.content}</Typography.Text>
          <br />
          <br />
          <Button
            type="primary"
            onClick={handleCreateFile}
            disabled={!details.path}
          >
            Создать файл
          </Button>
        </div>
      )}
    </Card>
  );
}

export default ContentDisplay;
