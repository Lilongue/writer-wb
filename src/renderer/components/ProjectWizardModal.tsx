/* eslint-disable no-console */
import { useState, useEffect, FC } from 'react';
import {
  Button,
  Modal,
  Steps,
  Typography,
  Input,
  Form,
  Space,
  Checkbox,
} from 'antd';
import { PredefinedNarrativeTemplate } from '../../common/types';

const { Step } = Steps;
const { Title, Text } = Typography;

const steps = [
  {
    title: 'Настройка проекта и структуры',
  },
  {
    title: 'Дальнейшие действия',
  },
];

interface ProjectWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (values: any) => void;
}

const ProjectWizardModal: FC<ProjectWizardModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const [current, setCurrent] = useState(0);
  const [narrativeLevels, setNarrativeLevels] = useState<
    PredefinedNarrativeTemplate[]
  >([]);
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      window.electron.template
        .getPredefinedNarrativeTemplates()
        .then((levels) => {
          setNarrativeLevels(levels);
          return undefined;
        })
        .catch(console.error);
    }
  }, [visible]);

  const handleSelectLocation = async () => {
    const { canceled, filePaths } = await window.electron.dialog.showOpenDialog(
      {
        properties: ['openDirectory'],
        title: 'Выберите папку для нового проекта',
      },
    );
    if (!canceled && filePaths.length > 0) {
      form.setFieldsValue({ location: filePaths[0] });
    }
  };

  const next = () => {
    form
      .validateFields()
      .then(() => {
        setCurrent(current + 1);
        return undefined;
      })
      .catch(console.error);
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const handleCreate = () => {
    form
      .validateFields()
      .then((values) => {
        onCreate(values);
        form.resetFields(); // Reset form fields on successful creation
        setCurrent(0); // Reset step to 0 on successful creation
        onClose(); // Close modal after reset
        return undefined;
      })
      .catch(console.error);
  };

  const renderFooter = () => (
    <div className="modal-footer-split">
      <Button onClick={onClose}>Отмена</Button>
      <Space>
        {current > 0 && <Button onClick={() => prev()}>Назад</Button>}
        {current < steps.length - 1 && (
          <Button type="primary" onClick={() => next()}>
            Далее
          </Button>
        )}
        {current === steps.length - 1 && (
          <Button type="primary" onClick={handleCreate}>
            Создать проект
          </Button>
        )}
      </Space>
    </div>
  );

  const checkboxOptions = narrativeLevels.map((level) => ({
    label: level.label,
    value: level.name,
  }));

  return (
    <Modal
      title={<Title level={4}>Мастер создания проекта</Title>}
      open={visible}
      onCancel={onClose}
      closable={false}
      footer={renderFooter()}
      width={600}
      destroyOnHidden
      styles={{ body: { paddingTop: '16px' } }}
    >
      <Steps current={current} style={{ marginBottom: 24 }}>
        {steps.map((item) => (
          <Step key={item.title} title={item.title} />
        ))}
      </Steps>

      <Form
        form={form}
        layout="vertical"
        name="project_wizard_form"
        initialValues={{ narrativeStructure: ['part', 'chapter', 'scene'] }}
        preserve={false}
      >
        <div className={current === 0 ? '' : 'hidden-step'}>
          <Form.Item
            name="projectName"
            label="Имя проекта"
            rules={[
              { required: true, message: 'Пожалуйста, введите имя проекта!' },
            ]}
          >
            <Input autoFocus placeholder="Введите имя вашего проекта" />
          </Form.Item>
          <Form.Item
            label="Папка проекта"
            tooltip="Проект будет создан непосредственно в этой папке"
          >
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="location"
                noStyle
                rules={[
                  {
                    required: true,
                    message: 'Пожалуйста, выберите папку для проекта!',
                  },
                ]}
              >
                <Input
                  readOnly
                  placeholder="Выберите существующую или создайте новую папку для проекта"
                />
              </Form.Item>
              <Button onClick={handleSelectLocation}>Выбрать...</Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            name="createSubfolder"
            valuePropName="checked"
            initialValue
            tooltip="Создать подпапку с именем проекта внутри выбранной папки"
          >
            <Checkbox>Создать подпапку для проекта</Checkbox>
          </Form.Item>
          <Form.Item
            name="narrativeStructure"
            label="Выберите уровни иерархии для вашего повествования:"
            rules={[
              { required: true, message: 'Выберите хотя бы один уровень!' },
            ]}
          >
            <Checkbox.Group
              className="narrative-checkbox-group"
              options={checkboxOptions}
            />
          </Form.Item>
        </div>
      </Form>

      <div className="steps-content">
        {current === 1 && (
          <Space direction="vertical">
            <Title level={5}>Проект почти готов!</Title>
            <Text>
              (<span className="text-dev-note">В разработке</span>) В будущем
              тут будет импорт предустановленных шаблонов. <br />
              Пока что вы можете это сделать после создания проекта вы сможете в
              импортировать готовые шаблоны для объектов мира (персонажей,
              локаций и т.д.) через &quot;Менеджер шаблонов&quot;. В будущем
              здесь также можно будет выбирать тему проекта.
            </Text>
          </Space>
        )}
      </div>
    </Modal>
  );
};

export default ProjectWizardModal;
