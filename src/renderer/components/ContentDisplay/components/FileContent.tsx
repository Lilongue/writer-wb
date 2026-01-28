import React from 'react';
import { Button, Typography } from 'antd';
import ReactMarkdown from 'react-markdown';

interface FileContentProps {
  fileExists: boolean | undefined;
  content: string | null;
  onCreteFile: () => void;
  isCreateFileDisabled: boolean;
}

const FileContent: React.FC<FileContentProps> = ({
  fileExists,
  content,
  onCreteFile,
  isCreateFileDisabled,
}) => {
  return fileExists ? (
    <div className="file-content-wrapper">
      <Typography.Text>
        <ReactMarkdown>{content || ''}</ReactMarkdown>
      </Typography.Text>
    </div>
  ) : (
    <div className="create-file-container">
      <Typography.Text type="secondary">{content}</Typography.Text>
      <br />
      <br />
      <Button
        type="primary"
        onClick={onCreteFile}
        disabled={isCreateFileDisabled}
      >
        Создать файл
      </Button>
    </div>
  );
};

export default FileContent;
