/* eslint-disable no-console */
import { Card, Empty, Button } from 'antd';
import { useState, forwardRef, useImperativeHandle } from 'react';
import useItemDetails from './useItemDetails';
import useItemEditor from './useItemEditor';
import ContentDisplayHeader from './components/ContentDisplayHeader';
import WorldObjectDetails from './components/WorldObjectDetails';
import NarrativeDetails from './components/NarrativeDetails';
import ConnectionsManager from './components/ConnectionsManager';
import FileContent from './components/FileContent';
import { EntityType } from '../../../common/types';
import AttachedFiles from './components/AttachedFiles';

interface ContentDisplayProps {
  selectedId: number | null;
  selectedType: EntityType | null;
}

export interface ContentDisplayRef {
  save: () => Promise<any>;
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

const ContentDisplay = forwardRef<ContentDisplayRef, ContentDisplayProps>(
  ({ selectedId, selectedType }, ref) => {
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
      handleOpenAttachedFile,
      handleCreateFile,
      handleDeleteConnection,
    } = useItemDetails({ selectedId, selectedType });

    const {
      editedDetails,
      handleFieldChange,
      handleNameChange,
      handleTitleChange,
      handleDescriptionChange,
      handlePlanChange,
      handleSave,
      isChanged,
    } = useItemEditor({ details, selectedType, fetchDetails });

    // Expose the save method via the ref
    useImperativeHandle(ref, () => ({
      save: handleSave,
    }));

    const handleOpenFolderClick = () => {
      if (details?.path) {
        const folderPath = getDirname(details.path);
        if (folderPath) {
          window.electron.fs.openFolder(folderPath);
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

    const currentEntity = {
      id: selectedId,
      type: selectedType,
      name: details.name || '',
    };

    const nameLabel =
      selectedType === EntityType.Narrative ? 'Название' : 'Имя объекта';

    const folderPath =
      selectedType === EntityType.WorldObject && details.path
        ? getDirname(details.path)
        : null;

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
        {selectedType === EntityType.WorldObject && (
          <WorldObjectDetails
            name={editedDetails.name || ''}
            onNameChange={handleNameChange}
            nameLabel={nameLabel}
            customFields={editedDetails.customFields || []}
            onFieldChange={handleFieldChange}
          />
        )}

        {selectedType === EntityType.Narrative && (
          <NarrativeDetails
            name={editedDetails.name || ''}
            onNameChange={handleNameChange}
            title={editedDetails.title}
            onTitleChange={handleTitleChange}
            nameLabel={nameLabel}
            description={editedDetails.description}
            plan={editedDetails.plan}
            onDescriptionChange={handleDescriptionChange}
            onPlanChange={handlePlanChange}
            planCollapseKey={planCollapseKey}
            onPlanCollapseChange={setPlanCollapseKey}
          />
        )}

        <AttachedFiles
          folderPath={folderPath}
          onOpenFile={handleOpenAttachedFile}
        />

        <ConnectionsManager
          connections={details.connections || []}
          onDeleteConnection={handleDeleteConnection}
          onAddConnection={handleAddConnection}
          searchResults={searchResults}
          onSearch={debouncedSearch}
          currentEntity={currentEntity}
        />

        <FileContent
          fileExists={details.fileExists}
          content={details.content}
          onCreteFile={handleCreateFile}
          isCreateFileDisabled={!details.path}
        />
      </Card>
    );
  },
);

export default ContentDisplay;
