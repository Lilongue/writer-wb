import { message, notification } from 'antd';

const notificationService = {
  showError: (title: string, content?: string) => {
    notification.error({
      message: title,
      description: content,
      placement: 'topRight',
    });
  },

  showSuccess: (text: string) => {
    message.success(text);
  },

  showInfo: (text: string) => {
    message.info(text);
  },

  showWarning: (text: string) => {
    message.warning(text);
  },
};

export default notificationService;
