import React, { useState } from 'react';
import {
  Button,
  Space,
  Tooltip,
  Segmented,
  Checkbox,
  Collapse,
  Dropdown,
  Menu,
} from 'antd';
import {
  PlusCircleOutlined,
  AppstoreOutlined,
  BarsOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { DetailedConnection, ResolvedEntity } from '../../../../common/types'; // Import new types
import AddConnectionModal from '../../AddConnectionModal';
import ConnectionListItem from './ConnectionListItem';

interface ConnectionsManagerProps {
  currentEntityId: number;
  connections: DetailedConnection[]; // Updated type
  onDeleteConnection: (connectionId: number) => void;
  onAddConnection: (values: any) => void;
  searchResults: ResolvedEntity[]; // Updated type
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
  const [viewMode, setViewMode] = useState<'list' | 'schema'>('list');

  const connectionsCount = connections ? connections.length : 0;
  const panelHeader = `Связи (${connectionsCount})`;

  const filterMenu = (
    <Menu>
      <Menu.Item key="1" onClick={(e) => e.domEvent.stopPropagation()}>
        <Checkbox>Персонаж</Checkbox>
      </Menu.Item>
      <Menu.Item key="2" onClick={(e) => e.domEvent.stopPropagation()}>
        <Checkbox>Локация</Checkbox>
      </Menu.Item>
      <Menu.Item key="3" onClick={(e) => e.domEvent.stopPropagation()}>
        <Checkbox>Предмет</Checkbox>
      </Menu.Item>
    </Menu>
  );

  const headerContent = (
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
  );

  if (connectionsCount === 0) {
    return (
      <div className="connections-section">
        {headerContent}
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
  }

  return (
    <div className="connections-section">
      <Collapse defaultActiveKey={['1']} ghost>
        <Collapse.Panel header={panelHeader} key="1">
          <div className="connections-controls">
            <Segmented
              options={[
                { label: 'Список', value: 'list', icon: <BarsOutlined /> },
                { label: 'Схема', value: 'schema', icon: <AppstoreOutlined /> },
              ]}
              value={viewMode}
              onChange={(value) => setViewMode(value as 'list' | 'schema')}
            />
            <Space className="filter-group">
              <Checkbox>Повествование</Checkbox>
              <Checkbox>Объекты мира</Checkbox>
              <Dropdown
                overlay={filterMenu}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button icon={<FilterOutlined />} />
              </Dropdown>
            </Space>
          </div>

          {viewMode === 'list' && (
            <div className="connections-list-view">
              <div className="custom-connections-list">
                {connections.map((connection) => (
                  <ConnectionListItem
                    key={connection.id}
                    connection={connection}
                    onDelete={onDeleteConnection}
                  />
                ))}
              </div>
            </div>
          )}

          {viewMode === 'schema' && (
            <div className="connections-schema-view">
              <p>Отображение схемы будет реализовано позже.</p>
            </div>
          )}
        </Collapse.Panel>
      </Collapse>
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
