/* eslint-disable no-console */

// Create a holder for the notification and message APIs
export const apiHolder: { notification?: any; message?: any } = {};

const notificationService = {
  showError: (title: string, content?: string) => {
    if (apiHolder.notification) {
      apiHolder.notification.error({
        message: title,
        description: content,
        placement: 'topRight',
      });
    } else {
      console.error(
        'Notification API not initialized. Message:',
        title,
        content,
      );
    }
  },

  showSuccess: (text: string) => {
    if (apiHolder.message) {
      apiHolder.message.success(text);
    } else {
      console.error('Message API not initialized. Message:', text);
    }
  },

  showInfo: (title: string, content?: string) => {
    if (apiHolder.message) {
      apiHolder.message.info({
        message: title,
        description: content,
      });
    } else {
      console.error('Message API not initialized. Message:', title, content);
    }
  },

  showWarning: (text: string) => {
    if (apiHolder.message) {
      apiHolder.message.warning(text);
    } else {
      console.error('Message API not initialized. Message:', text);
    }
  },
};

export default notificationService;
