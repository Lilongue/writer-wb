import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { EntityType, ItemDetails } from '../../../common/types';
import notificationService from '../../services/notificationService';
import { cleanNameInput } from '../../../common/utils';

interface UseItemEditorProps {
  details: ItemDetails | null;
  selectedType: EntityType | null;
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
        title: details.title,
        customFields: details.customFields,
        description: details.description,
        plan: details.plan,
      });
    }
  }, [details]);

  const isChanged = useMemo(() => {
    if (!details || !editedDetails) return false;

    if (details.name !== editedDetails.name) return true;
    if (details.title !== editedDetails.title) return true;

    if (selectedType === EntityType.WorldObject) {
      return (
        JSON.stringify(details.customFields) !==
        JSON.stringify(editedDetails.customFields)
      );
    }

    if (selectedType === EntityType.Narrative) {
      if (details.description !== editedDetails.description) return true;
      if (details.plan !== editedDetails.plan) return true;
    }

    return false;
  }, [details, editedDetails, selectedType]);

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

  const handleTitleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setEditedDetails({ ...editedDetails, title: e.target.value });
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

  const handleSave = useCallback(async () => {
    if (!isChanged || !details || !editedDetails || !selectedType) {
      return Promise.resolve();
    }

    let promise;
    if (selectedType === EntityType.WorldObject) {
      const properties =
        editedDetails.customFields?.reduce(
          (acc, field) => {
            acc[field.key] = cleanNameInput(field.value); // Trim custom field value
            return acc;
          },
          {} as Record<string, string>,
        ) || {};

      promise = window.electron.ipcRenderer.invoke(
        'world-object:update-details',
        {
          id: details.id,
          name: cleanNameInput(editedDetails.name || ''), // Trim name
          properties: JSON.stringify(properties),
        },
      );
    } else if (selectedType === EntityType.Narrative) {
      promise = window.electron.ipcRenderer.invoke('narrative:update-details', {
        id: details.id,
        name: cleanNameInput(editedDetails.name || ''), // Trim name
        title: cleanNameInput(editedDetails.title || ''), // Trim title
        description: cleanNameInput(editedDetails.description || ''), // Trim description
        plan: editedDetails.plan,
      });
    } else {
      return Promise.resolve();
    }

    return promise
      .then(() => {
        notificationService.showSuccess('Изменения успешно сохранены');
        return fetchDetails ? fetchDetails() : null;
      })
      .catch((error) => {
        notificationService.showError(
          `Ошибка обновления ${
            selectedType === EntityType.Narrative
              ? 'элемента повествования'
              : 'объекта мира'
          }`,
          String(error),
        );
        // Re-throw the error if you want the caller to be able to catch it
        throw error;
      });
  }, [details, editedDetails, selectedType, fetchDetails, isChanged]);

  return {
    editedDetails,
    setEditedDetails, // Potentially needed for reset or external modifications
    handleFieldChange,
    handleNameChange,
    handleTitleChange,
    handleDescriptionChange,
    handlePlanChange,
    handleSave,
    isChanged,
  };
};

export default useItemEditor;
