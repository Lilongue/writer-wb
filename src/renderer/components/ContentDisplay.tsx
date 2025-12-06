/* eslint-disable no-console */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Typography,
  Input,
  List,
  Tooltip,
} from 'antd';
import {
  MinusOutlined,
  PlusOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import AddConnectionModal from './AddConnectionModal';
import ChecklistEditor from './ChecklistEditor'; // Import ChecklistEditor
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
  const [isModalVisible, setIsModalVisible] = useState(false);
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
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    setDetails(null);
    return null;
  }, [selectedId, selectedType]);

  const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

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

  const handleModalOk = (values: any) => {
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
        setIsModalVisible(false);
        fetchDetails();
        return null;
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (details) {
      setEditedDetails({
        name: details.name,
        customFields: details.customFields,
        description: details.description, // Initialize description
        plan: details.plan, // Initialize plan
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
        .then((stats: unknown) => {
          const fileStats = stats as { mtimeMs: number } | null;
          if (fileStats && details.mtime !== fileStats.mtimeMs) {
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
        .then((result: unknown) => {
          const createFileResult = result as { success: boolean };
          if (createFileResult.success) {
            // Перезагружаем детали, чтобы показать пустой файл
            fetchDetails();
          }
          return createFileResult;
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

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setEditedDetails({ ...editedDetails, description: e.target.value });
  };

  const handlePlanChange = (value: string) => {
    setEditedDetails({ ...editedDetails, plan: value });
  };

  const handleSave = () => {
    if (!details || !editedDetails || !selectedType) return;

    if (selectedType === 'world') {
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
    } else if (selectedType === 'narrative') {
      window.electron.ipcRenderer
        .invoke('narrative:update-details', {
          id: details.id,
          name: editedDetails.name,
          description: editedDetails.description,
          plan: editedDetails.plan,
        })
        .then(() => {
          fetchDetails(); // Refresh to show updated values
          return null;
        })
        .catch(console.error);
    }
  };

  const handleDeleteConnection = (connectionId: number) => {
    window.electron.ipcRenderer
      .invoke('connections:delete', connectionId)
      .then(() => fetchDetails())
      .catch(console.error);
  };

  const isChanged = useMemo(() => {
    if (!details || !editedDetails) return false;

    if (details.name !== editedDetails.name) return true;

    if (selectedType === 'world') {
      return (
        JSON.stringify(details.customFields) !==
        JSON.stringify(editedDetails.customFields)
      );
    }

    if (selectedType === 'narrative') {
      if (details.description !== editedDetails.description) return true;
      if (details.plan !== editedDetails.plan) return true;
    }

    return false;
  }, [details, editedDetails, selectedType]);

  if (!selectedId || !details || !editedDetails) {
    return (
      <div className="empty-details-container">
        <Empty description="Выберите элемент в дереве, чтобы увидеть детали" />
      </div>
    );
  }

  return (
    <>
      <Card
        loading={loading}
        title={
          <div className="content-display-title-wrapper">
            <Input
              value={editedDetails.name}
              onChange={handleNameChange}
              disabled={false} // Name is editable for both types
              className="content-display-name-input"
            />
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
          </div>
        }
        className="content-display-card"
        extra={null}
      >
        {selectedType === 'world' &&
          editedDetails.customFields &&
          editedDetails.customFields.length > 0 && (
            <>
              <h3>Дополнительные поля</h3>
              <Descriptions bordered size="small" column={1}>
                {editedDetails.customFields.map((field, index) => (
                  <Descriptions.Item
                    key={field.key}
                    label={
                      <span>
                        {field.label}
                        {field.comment && (
                          <Tooltip title={field.comment}>
                            <InfoCircleOutlined
                              style={{ marginLeft: 4, color: '#888' }}
                            />
                          </Tooltip>
                        )}
                      </span>
                    }
                  >
                    <Input
                      value={field.value}
                      onChange={(e) => handleFieldChange(index, e.target.value)}
                      disabled={false} // Custom fields for world objects are editable
                    />
                  </Descriptions.Item>
                ))}
              </Descriptions>
              <br />
            </>
          )}

        {selectedType === 'narrative' && (
          <>
            <h3>Основная мысль</h3>
            <Input.TextArea
              value={editedDetails.description}
              onChange={handleDescriptionChange}
              autoSize={{ minRows: 3, maxRows: 10 }}
              style={{ marginBottom: 16 }}
            />
            <h3>План</h3>
            <ChecklistEditor
              value={editedDetails.plan || ''}
              onChange={handlePlanChange}
            />
            <br />
          </>
        )}

        <div className="connections-section">
          <div className="connections-header">
            <h3>Связи</h3>

            <Button
              type="primary"
              shape="circle"
              icon={<PlusOutlined />}
              onClick={() => setIsModalVisible(true)}
            />
          </div>

          {details.connections && details.connections.length > 0 && (
            <>
              <List
                itemLayout="horizontal"
                dataSource={details.connections}
                renderItem={(item: any) => (
                  <List.Item
                    actions={[
                      <Button
                        type="primary"
                        danger
                        shape="circle"
                        icon={<MinusOutlined />}
                        onClick={() => handleDeleteConnection(item.id)}
                      />,
                    ]}
                  >
                    <List.Item.Meta
                      title={item.other_entity.name}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />

              <br />
            </>
          )}
        </div>

        {details.fileExists ? (
          <Typography.Text>
            <ReactMarkdown>{details.content || ''}</ReactMarkdown>
          </Typography.Text>
        ) : (
          <div className="create-file-container">
            <Typography.Text type="secondary">
              {details.content}
            </Typography.Text>
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

      <AddConnectionModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleModalOk}
        options={searchResults.map((item) => ({
          ...item,
          value: JSON.stringify({ id: item.id, type: item.type }),
        }))}
        onSearch={debouncedSearch}
      />
    </>
  );
}

export default ContentDisplay;
