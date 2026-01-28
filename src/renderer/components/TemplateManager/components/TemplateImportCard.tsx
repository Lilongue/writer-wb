import { Card, Checkbox, List, Typography } from 'antd';
import { PredefinedTemplate } from '../../../../common/types';

const { Text } = Typography;

interface TemplateImportCardProps {
  template: PredefinedTemplate;
  selected: boolean;
  onSelect: (templateName: string) => void;
}

const TemplateImportCard = ({
  template,
  selected,
  onSelect,
}: TemplateImportCardProps) => {
  return (
    <Card
      title={template.name}
      className="template-import-card"
      hoverable
      onClick={() => onSelect(template.name)}
      extra={
        <Checkbox
          checked={selected}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(template.name);
          }}
        />
      }
      styles={{ header: { backgroundColor: '#f0f0f0' } }}
    >
      <List
        dataSource={template.fields}
        renderItem={(field) => (
          <List.Item>
            <Text>{field.label}</Text>
          </List.Item>
        )}
        size="small"
      />
    </Card>
  );
};

export default TemplateImportCard;
