/* eslint-disable no-console */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result } from 'antd';
import notificationService from '../services/notificationService';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component:', error, errorInfo);
    notificationService.showError(
      'Ошибка отображения',
      'Произошла ошибка при отображении компонента. Пожалуйста, попробуйте перезагрузить страницу или перезапустить приложение.',
    );
  }

  render() {
    const { hasError } = this.state;
    if (hasError) {
      return (
        <Result
          status="error"
          title="Что-то пошло не так"
          subTitle="Произошла ошибка при отображении этой части приложения."
        />
      );
    }
    const { children } = this.props;
    return children;
  }
}

export default ErrorBoundary;
