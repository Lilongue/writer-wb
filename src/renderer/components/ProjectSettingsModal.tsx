/* eslint-disable no-console */
import { useState, useEffect, useMemo, useCallback, FC } from 'react';
import {
  Modal,
  Button,
  Form,
  Input,
  Checkbox,
  InputNumber,
  Typography,
} from 'antd';
import { useProject } from '../contexts/ProjectContext';
import { ProjectSetting } from '../../common/types';

const { Text } = Typography;

interface ProjectSettingsModalProps {
  show: boolean;
  onClose: () => void;
}

const ProjectSettingsModal: FC<ProjectSettingsModalProps> = ({
  show,
  onClose,
}) => {
  const { isProjectOpen } = useProject();
  const [settings, setSettings] = useState<ProjectSetting[]>([]);
  const [editedSettings, setEditedSettings] = useState<Record<string, any>>({});
  const [form] = Form.useForm();

  useEffect(() => {
    if (show && isProjectOpen) {
      window.electron.ipcRenderer
        .invoke('project-settings:get-all')
        .then((allSettings) => {
          const typedSettings = allSettings as ProjectSetting[];
          setSettings(typedSettings);
          const initialEdited: Record<string, any> = {};
          typedSettings.forEach((setting) => {
            initialEdited[setting.key] = setting.value;
          });
          setEditedSettings(initialEdited);
          form.setFieldsValue(initialEdited); // Set form values
          return undefined;
        })
        .catch((error) => {
          console.error('Ошибка загрузки настроек проекта:', error);
          // TODO: Show error to user
        });
    }
  }, [show, isProjectOpen, form]);

  const groupedSettings = useMemo(() => {
    const groups: Record<string, ProjectSetting[]> = {};
    settings.forEach((setting) => {
      if (!groups[setting.category]) {
        groups[setting.category] = [];
      }
      groups[setting.category].push(setting);
    });
    const sortedCategories = Object.keys(groups).sort();
    const sortedGrouped: Record<string, ProjectSetting[]> = {};
    sortedCategories.forEach((category) => {
      sortedGrouped[category] = groups[category].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    });
    return sortedGrouped;
  }, [settings]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields(); // Validate and get values from Ant Design Form
      const settingsToUpdate = settings
        .filter((setting) => values[setting.key] !== setting.value)
        .map((setting) => ({
          key: setting.key,
          value: values[setting.key],
        }));

      if (settingsToUpdate.length > 0) {
        await window.electron.ipcRenderer.invoke(
          'project-settings:update',
          settingsToUpdate,
        );
        // Re-fetch settings after successful update to ensure UI is consistent
        const allSettings: ProjectSetting[] =
          await window.electron.ipcRenderer.invoke('project-settings:get-all');
        setSettings(allSettings);
        const updatedEdited: Record<string, any> = {};
        allSettings.forEach((s) => {
          updatedEdited[s.key] = s.value;
          return undefined;
        });
        setEditedSettings(updatedEdited);
        form.setFieldsValue(updatedEdited);
        onClose();
      } else {
        onClose();
      }
    } catch (errorInfo) {
      console.error('Ошибка сохранения настроек проекта:', errorInfo);
      // TODO: Show error to user
    }
  }, [form, settings, onClose]);

  const renderSettingInput = useCallback((setting: ProjectSetting) => {
    const placeholder = setting.description || 'Введите значение...';
    switch (setting.type) {
      case 'text':
        return <Input placeholder={placeholder} />;
      case 'number':
        return (
          <InputNumber style={{ width: '100%' }} placeholder={placeholder} />
        );
      case 'boolean':
        return <Checkbox>{setting.name}</Checkbox>;
      default:
        return <Input disabled />;
    }
  }, []);

  return (
    <Modal
      title="Настройки проекта"
      open={show}
      onCancel={onClose}
      closable={false}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Отменить
        </Button>,
        <Button key="submit" type="primary" onClick={handleSave}>
          Сохранить изменения
        </Button>,
      ]}
      width={800}
      centered
      destroyOnHidden
    >
      <div className="settings-modal-body">
        {Object.keys(groupedSettings).length > 0 ? (
          <Form form={form} layout="vertical" initialValues={editedSettings}>
            {Object.entries(groupedSettings).map(
              ([category, categorySettings]) => (
                <div key={category} className="settings-category-group">
                  <h2>{category}</h2>
                  {categorySettings.map((setting) => (
                    <Form.Item
                      key={setting.key}
                      label={
                        setting.type !== 'boolean' ? setting.name : undefined
                      } // Label for non-boolean types
                      name={setting.key}
                      valuePropName={
                        setting.type === 'boolean' ? 'checked' : 'value'
                      } // Correct prop for checkbox
                      tooltip={setting.description || undefined}
                    >
                      {renderSettingInput(setting)}
                    </Form.Item>
                  ))}
                </div>
              ),
            )}
          </Form>
        ) : (
          <Text>Нет доступных настроек.</Text>
        )}
      </div>
    </Modal>
  );
};

export default ProjectSettingsModal;
