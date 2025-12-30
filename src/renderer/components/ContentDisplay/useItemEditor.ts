/* eslint-disable no-console */
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ItemDetails } from '../../../common/types';

interface UseItemEditorProps {
  details: ItemDetails | null;
  selectedType: 'narrative' | 'world' | null;
  fetchDetails: () => Promise<ItemDetails | null> | null;
}

const useItemEditor = ({
  details,
  selectedType,
  fetchDetails,
}: UseItemEditorProps) => {
  const [editedDetails, setEditedDetails] =
    useState<Partial<ItemDetails> | null>(null);

  useEffect(() => {
    if (details) {
      setEditedDetails({
        name: details.name,
        customFields: details.customFields,
        description: details.description,
        plan: details.plan,
      });
    }
  }, [details]);

  const handleFieldChange = useCallback(
    (index: number, value: string) => {
      if (!editedDetails?.customFields) return;
      const newFields = [...editedDetails.customFields];
      newFields[index] = { ...newFields[index], value };
      setEditedDetails({ ...editedDetails, customFields: newFields });
    },
    [editedDetails],
  );

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setEditedDetails({ ...editedDetails, name: e.target.value });
    },
    [editedDetails],
  );

  const handleDescriptionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setEditedDetails({ ...editedDetails, description: e.target.value });
    },
    [editedDetails],
  );

  const handlePlanChange = useCallback(
    (value: string) => {
      setEditedDetails({ ...editedDetails, plan: value });
    },
    [editedDetails],
  );

  const handleSave = useCallback(() => {
    if (!details || !editedDetails || !selectedType) return;

    if (selectedType === 'world') {
      const properties =
        editedDetails.customFields?.reduce(
          (acc, field) => {
            acc[field.key] = field.value;
            return acc;
          },
          {} as Record<string, string>,
        ) || {};

      window.electron.ipcRenderer
        .invoke('world-object:update-details', {
          id: details.id,
          name: editedDetails.name,
          properties: JSON.stringify(properties),
        })
        .then(() => fetchDetails && fetchDetails()) // Refresh details after save
        .catch(console.error);
    } else if (selectedType === 'narrative') {
      window.electron.ipcRenderer
        .invoke('narrative:update-details', {
          id: details.id,
          name: editedDetails.name,
          description: editedDetails.description,
          plan: editedDetails.plan,
        })
        .then(() => fetchDetails && fetchDetails()) // Refresh to show updated values
        .catch(console.error);
    }
  }, [details, editedDetails, selectedType, fetchDetails]);

  const isChanged = useMemo(() => {
    if (!details || !editedDetails) return false;

    if (details.name !== editedDetails.name) return true;

    if (selectedType === 'world') {
      return (
        JSON.stringify(details.customFields) !==
        JSON.stringify(editedDetails.customFields)
      );
    }

    if (selectedType === 'narrative') {
      if (details.description !== editedDetails.description) return true;
      if (details.plan !== editedDetails.plan) return true;
    }

    return false;
  }, [details, editedDetails, selectedType]);

  return {
    editedDetails,
    setEditedDetails, // Potentially needed for reset or external modifications
    handleFieldChange,
    handleNameChange,
    handleDescriptionChange,
    handlePlanChange,
    handleSave,
    isChanged,
  };
};

export default useItemEditor;
