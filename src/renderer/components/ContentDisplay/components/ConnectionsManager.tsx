import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Space,
  Tooltip,
  Segmented,
  Checkbox,
  Collapse,
  Dropdown,
  Menu,
  Typography,
} from 'antd';
import {
  PlusCircleOutlined,
  AppstoreOutlined,
  BarsOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import ConnectionGraph from './ConnectionGraph';
import {
  DetailedConnection,
  ResolvedEntity,
  EntityType,
} from '../../../../common/types';
import AddConnectionModal from '../../AddConnectionModal';
import ConnectionListItem from './ConnectionListItem';

interface ConnectionsManagerProps {
  connections: DetailedConnection[];
  onDeleteConnection: (connectionId: number) => void;
  onAddConnection: (values: any) => void;
  searchResults: ResolvedEntity[];
  onSearch: (query: string) => void;
  currentEntity: { id: number | null; type: EntityType | null; name: string };
}

type FilterTemplate = { id: number; name: string };

const ConnectionsManager: React.FC<ConnectionsManagerProps> = ({
  connections,
  onDeleteConnection,
  onAddConnection,
  searchResults,
  onSearch,
  currentEntity,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'schema'>('list');
  const [availableTemplates, setAvailableTemplates] = useState<
    FilterTemplate[]
  >([]);
  const [filters, setFilters] = useState({
    showNarrative: true,
    showWorldObjects: true,
    templateIds: [] as number[],
  });

  // Effect to extract available templates from connections
  useEffect(() => {
    const templatesMap = new Map<number, FilterTemplate>();
    connections.forEach((conn) => {
      if (
        conn.connectedEntity.type === EntityType.WorldObject &&
        conn.connectedEntity.template
      ) {
        templatesMap.set(
          conn.connectedEntity.template.id,
          conn.connectedEntity.template,
        );
      }
    });
    const newTemplates = Array.from(templatesMap.values());
    setAvailableTemplates(newTemplates);

    // Initialize/sync templateIds filter when available templates change
    setFilters((prev) => ({
      ...prev,
      templateIds: newTemplates.map((t) => t.id),
    }));
  }, [connections]);

  const handleNarrativeFilterChange = (isChecked: boolean) => {
    setFilters((prev) => ({ ...prev, showNarrative: isChecked }));
  };

  const handleShowWorldObjectsChange = (isChecked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      showWorldObjects: isChecked,
      templateIds: isChecked ? availableTemplates.map((t) => t.id) : [],
    }));
  };

  const handleTemplateFilterChange = (
    templateId: number,
    isChecked: boolean,
  ) => {
    setFilters((prev) => {
      const { templateIds } = prev;
      const newTemplateIds = isChecked
        ? [...templateIds, templateId]
        : templateIds.filter((id) => id !== templateId);

      return {
        ...prev,
        templateIds: newTemplateIds,
        showWorldObjects: newTemplateIds.length > 0,
      };
    });
  };

  const filteredConnections = useMemo(() => {
    return connections.filter((conn) => {
      const { connectedEntity } = conn;
      if (connectedEntity.type === EntityType.Narrative) {
        return filters.showNarrative;
      }
      if (connectedEntity.type === EntityType.WorldObject) {
        if (!filters.showWorldObjects) return false;
        if (!connectedEntity.template) return false;
        return filters.templateIds.includes(connectedEntity.template.id);
      }
      return true;
    });
  }, [connections, filters]);

  const connectionsCount = connections ? connections.length : 0;

  const headerContent = (
    <div className="uniform-collapse-header">
      <Typography.Text strong>
        Связи{' '}
        {connectionsCount > 0 &&
          `(${filteredConnections.length} / ${connectionsCount})`}
      </Typography.Text>
      <Tooltip title="Добавить новую связь">
        <Button
          type="text"
          shape="circle"
          icon={<PlusCircleOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            setIsModalVisible(true);
          }}
        />
      </Tooltip>
    </div>
  );

  const filterMenu = (
    <Menu>
      {availableTemplates.map((template) => (
        <Menu.Item
          key={template.id}
          onClick={(e) => e.domEvent.stopPropagation()}
        >
          <Checkbox
            checked={filters.templateIds.includes(template.id)}
            onChange={(e) =>
              handleTemplateFilterChange(template.id, e.target.checked)
            }
          >
            {template.name}
          </Checkbox>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div className="connections-section">
      <Collapse defaultActiveKey={['1']}>
        <Collapse.Panel header={headerContent} key="1">
          {connectionsCount === 0 ? (
            <p>Связей пока нет. Добавьте первую!</p>
          ) : (
            <>
              <div className="connections-controls">
                <Segmented
                  options={[
                    { label: 'Список', value: 'list', icon: <BarsOutlined /> },
                    {
                      label: 'Схема',
                      value: 'schema',
                      icon: <AppstoreOutlined />,
                    },
                  ]}
                  value={viewMode}
                  onChange={(value) => setViewMode(value as 'list' | 'schema')}
                />
                <Space className="filter-group">
                  <Checkbox
                    checked={filters.showNarrative}
                    onChange={(e) =>
                      handleNarrativeFilterChange(e.target.checked)
                    }
                  >
                    Повествование
                  </Checkbox>
                  <Checkbox
                    checked={filters.showWorldObjects}
                    onChange={(e) =>
                      handleShowWorldObjectsChange(e.target.checked)
                    }
                  >
                    Объекты мира
                  </Checkbox>
                  <Dropdown
                    overlay={filterMenu}
                    trigger={['click']}
                    placement="bottomRight"
                    disabled={availableTemplates.length === 0}
                  >
                    <Button icon={<FilterOutlined />} />
                  </Dropdown>
                </Space>
              </div>

              {viewMode === 'list' && (
                <div className="connections-list-view">
                  <div className="custom-connections-list">
                    {filteredConnections.map((connection) => (
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
                  <ConnectionGraph
                    connections={filteredConnections}
                    currentEntity={currentEntity}
                  />
                </div>
              )}
            </>
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
