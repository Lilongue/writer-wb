/* eslint-disable no-console */
import { Card, Empty, Button } from 'antd';
import { useState } from 'react';
import useItemDetails from './useItemDetails';
import useItemEditor from './useItemEditor';
import ContentDisplayHeader from './components/ContentDisplayHeader';
import WorldObjectDetails from './components/WorldObjectDetails';
import NarrativeDetails from './components/NarrativeDetails';
import ConnectionsManager from './components/ConnectionsManager';
import FileContent from './components/FileContent';

interface ContentDisplayProps {
  selectedId: number | null;
  selectedType: 'narrative' | 'world' | null;
}

// Helper to get directory name without using 'path' module in renderer
const getDirname = (filePath: string): string => {
  if (!filePath) return '';
  const lastSlash = filePath.lastIndexOf('/');
  const lastBackslash = filePath.lastIndexOf('\\');
  const index = Math.max(lastSlash, lastBackslash);
  if (index === -1) {
    return '';
  }
  return filePath.substring(0, index);
};

function ContentDisplay({ selectedId, selectedType }: ContentDisplayProps) {
  const [planCollapseKey, setPlanCollapseKey] = useState<
    string | string[] | undefined
  >();

  const {
    details,
    loading,
    searchResults,
    fetchDetails,
    debouncedSearch,
    handleAddConnection,
    handleOpenFile,
    handleCreateFile,
    handleDeleteConnection,
  } = useItemDetails({ selectedId, selectedType });

  const {
    editedDetails,
    handleFieldChange,
    handleNameChange,
    handleDescriptionChange,
    handlePlanChange,
    handleSave,
    isChanged,
  } = useItemEditor({ details, selectedType, fetchDetails });

  const handleOpenFolderClick = () => {
    if (details?.path) {
      const folderPath = getDirname(details.path);
      if (folderPath) {
        window.electron.ipcRenderer.sendMessage(
          'open-in-external-editor',
          folderPath,
        );
      }
    }
  };

  if (!selectedId || !details || !editedDetails) {
    return (
      <div className="empty-details-container">
        <Empty description="Выберите элемент в дереве, чтобы увидеть детали" />
      </div>
    );
  }

  const nameLabel = selectedType === 'narrative' ? 'Название' : 'Имя объекта';

  return (
    <Card
      loading={loading}
      title={
        <ContentDisplayHeader
          selectedType={selectedType}
          onOpenFolderClick={handleOpenFolderClick}
          onOpenFileClick={handleOpenFile}
          isFileOpenable={!!(details?.path && details?.fileExists)}
        />
      }
      className="content-display-card"
      extra={
        <Button type="primary" onClick={handleSave} disabled={!isChanged}>
          Сохранить
        </Button>
      }
    >
      {selectedType === 'world' && (
        <WorldObjectDetails
          name={editedDetails.name || ''}
          onNameChange={handleNameChange}
          nameLabel={nameLabel}
          customFields={editedDetails.customFields || []}
          onFieldChange={handleFieldChange}
        />
      )}

      {selectedType === 'narrative' && (
        <NarrativeDetails
          name={editedDetails.name || ''}
          onNameChange={handleNameChange}
          nameLabel={nameLabel}
          description={editedDetails.description}
          plan={editedDetails.plan}
          onDescriptionChange={handleDescriptionChange}
          onPlanChange={handlePlanChange}
          planCollapseKey={planCollapseKey}
          onPlanCollapseChange={setPlanCollapseKey}
        />
      )}

      <ConnectionsManager
        connections={details.connections || []}
        onDeleteConnection={handleDeleteConnection}
        onAddConnection={handleAddConnection}
        searchResults={searchResults}
        onSearch={debouncedSearch}
      />

      <FileContent
        fileExists={details.fileExists}
        content={details.content}
        onCreteFile={handleCreateFile}
        isCreateFileDisabled={!details.path}
      />
    </Card>
  );
}

export default ContentDisplay;
