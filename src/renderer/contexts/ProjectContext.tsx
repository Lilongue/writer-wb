/* eslint-disable no-console */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { EntityTemplate } from '../../common/types';

interface ProjectContextType {
  isProjectOpen: boolean;
  narrativeTemplates: EntityTemplate[];
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [narrativeTemplates, setNarrativeTemplates] = useState<
    EntityTemplate[]
  >([]);

  // Memoize the context value
  const contextValue = useMemo(
    () => ({
      isProjectOpen,
      narrativeTemplates,
    }),
    [isProjectOpen, narrativeTemplates],
  );

  useEffect(() => {
    const fetchNarrativeTemplates = () => {
      window.electron.ipcRenderer
        .invoke('get-narrative-templates')
        .then((templates) => {
          setNarrativeTemplates(templates as EntityTemplate[]);
          return undefined;
        })
        .catch((error) =>
          console.error('Failed to fetch narrative templates:', error),
        );
    };

    // Check initial project status
    window.electron.ipcRenderer
      .invoke('project:isProjectOpen')
      .then((status) => {
        setIsProjectOpen(status as boolean);
        if (status) {
          fetchNarrativeTemplates();
        }
        return undefined; // Explicitly return undefined to satisfy the linter rule
      })
      .catch((error: Error) => {
        console.error('Failed to get initial project status:', error);
      });

    const handleProjectOpened = () => {
      setIsProjectOpen(true);
      fetchNarrativeTemplates();
    };

    const handleProjectClosed = () => {
      setIsProjectOpen(false);
      setNarrativeTemplates([]);
    };

    const cleanupOpened = window.electron.ipcRenderer.on(
      'project-opened',
      handleProjectOpened,
    );
    const cleanupClosed = window.electron.ipcRenderer.on(
      'project-closed',
      handleProjectClosed,
    );

    return () => {
      cleanupOpened();
      cleanupClosed();
    };
  }, []);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
