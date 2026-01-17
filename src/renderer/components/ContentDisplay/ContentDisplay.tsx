/* eslint-disable no-console */
import { Card, Empty } from 'antd';
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

  if (!selectedId || !details || !editedDetails) {
    return (
      <div className="empty-details-container">
        <Empty description="Выберите элемент в дереве, чтобы увидеть детали" />
      </div>
    );
  }

  return (
    <Card
      loading={loading}
      title={
        <ContentDisplayHeader
          name={editedDetails.name || ''}
          onNameChange={handleNameChange}
          onSave={handleSave}
          isSaveDisabled={!isChanged}
          onOpenFile={handleOpenFile}
          isOpenFileDisabled={!details.path || !details.fileExists}
        />
      }
      className="content-display-card"
      extra={null}
    >
      {selectedType === 'world' && (
        <WorldObjectDetails
          customFields={editedDetails.customFields || []}
          onFieldChange={handleFieldChange}
        />
      )}

      {selectedType === 'narrative' && (
        <NarrativeDetails
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
