import React, { useState } from 'react';
import { Button, List } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
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

  return (
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

      {connections && connections.length > 0 && (
        <>
          <List
            itemLayout="horizontal"
            dataSource={connections}
            renderItem={(item: any) => (
              <List.Item
                actions={[
                  <Button
                    type="primary"
                    danger
                    shape="circle"
                    icon={<MinusOutlined />}
                    onClick={() => onDeleteConnection(item.id)}
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

      <AddConnectionModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={(values) => {
          onAddConnection(values);
          setIsModalVisible(false); // Close modal after action
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
