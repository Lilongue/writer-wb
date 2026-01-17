import React, { useState } from 'react';
import { Button, List, Space, Tooltip, Collapse } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import AddConnectionModal from '../../AddConnectionModal';

interface ConnectionsManagerProps {
  connections: any[]; // Adjust type as needed
  onDeleteConnection: (connectionId: number) => void;
  onAddConnection: (values: any) => void;
  searchResults: any[]; // Adjust type as needed
  onSearch: (query: string) => void;
}

const ConnectionsManager: React.FC<ConnectionsManagerProps> = ({
  connections,
  onDeleteConnection,
  onAddConnection,
  searchResults,
  onSearch,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const connectionsCount = connections ? connections.length : 0;
  const panelHeader = `Связей: ${connectionsCount}`;

  return (
    <div className="connections-section">
      <div className="connections-header">
        <Space>
          <h3>Связи</h3>
          <Tooltip title="Добавить новую связь">
            <Button
              type="text"
              shape="circle"
              icon={<PlusCircleOutlined />}
              onClick={() => setIsModalVisible(true)}
            />
          </Tooltip>
        </Space>
      </div>

      {connectionsCount > 0 && (
        <Collapse ghost>
          <Collapse.Panel header={panelHeader} key="1">
            <List
              itemLayout="horizontal"
              dataSource={connections}
              renderItem={(item: any) => (
                <List.Item>
                  <div className="connection-item">
                    <Tooltip title="Удалить связь">
                      <Button
                        type="text"
                        danger
                        shape="circle"
                        icon={<MinusCircleOutlined />}
                        onClick={() => onDeleteConnection(item.id)}
                        className="connection-item-delete-button"
                      />
                    </Tooltip>
                    <div className="connection-item-content">
                      <span className="connection-item-title">
                        {item.other_entity.name}
                      </span>
                      {item.description && (
                        <p className="connection-item-description">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Collapse.Panel>
        </Collapse>
      )}
      <AddConnectionModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={(values) => {
          onAddConnection(values);
          setIsModalVisible(false);
        }}
        options={searchResults.map((item) => ({
          ...item,
          value: JSON.stringify({ id: item.id, type: item.type }),
        }))}
        onSearch={onSearch}
      />
    </div>
  );
};

export default ConnectionsManager;
