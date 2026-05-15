import React from 'react';
import { Button, Tooltip } from 'antd';
import {
  MinusCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  FileTextOutlined,
  BoxPlotOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { DetailedConnection, EntityType } from '../../../../common/types';

// A simple utility to get an icon based on the entity type and template
const getIconForEntityType = (type: EntityType, templateName?: string) => {
  switch (type) {
    case EntityType.WorldObject:
      // Use a more specific icon if templateName is available, otherwise default WorldObject icon
      return templateName ? <TagOutlined /> : <UserOutlined />;
    case EntityType.Narrative:
      return <FileTextOutlined />;
    default:
      return <BoxPlotOutlined />;
  }
};

interface ConnectionListItemProps {
  connection: DetailedConnection; // Updated type
  onDelete: (connectionId: number) => void;
}

const ConnectionListItem: React.FC<ConnectionListItemProps> = ({
  connection,
  onDelete,
}) => {
  const directionArrow =
    connection.connectionType === 'source' ? (
      <ArrowRightOutlined />
    ) : (
      <ArrowLeftOutlined />
    );
  const { connectedEntity } = connection;

  const entityDisplayName = connectedEntity.name || 'Неизвестный объект';

  return (
    <div className="connection-list-item-row">
      <div className="col-description">
        <span>{connection.description || 'Без описания'}</span>
      </div>
      <div className="col-arrow">{directionArrow}</div>
      <div className="col-entity">
        {getIconForEntityType(
          connectedEntity.type,
          connectedEntity.template?.name,
        )}
        <span className="entity-name">{entityDisplayName}</span>
        {connectedEntity.type === EntityType.WorldObject &&
          connectedEntity.template?.name && (
            <span className="entity-template-name">
              ({connectedEntity.template.name})
            </span>
          )}
      </div>
      <div className="col-action">
        <Tooltip title="Удалить связь">
          <Button
            type="text"
            danger
            shape="circle"
            icon={<MinusCircleOutlined />}
            onClick={() => onDelete(connection.id)}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default ConnectionListItem;
