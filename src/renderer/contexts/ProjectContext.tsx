/* eslint-disable no-console */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';

interface ProjectContextType {
  isProjectOpen: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  // Memoize the context value
  const contextValue = useMemo(
    () => ({
      isProjectOpen,
    }),
    [isProjectOpen],
  );

  useEffect(() => {
    // Check initial project status
    window.electron.ipcRenderer
      .invoke('project:isProjectOpen')
      .then((status) => {
        setIsProjectOpen(status as boolean);
        return undefined; // Explicitly return undefined to satisfy the linter rule
      })
      .catch((error: Error) => {
        console.error('Failed to get initial project status:', error);
      });

    const handleProjectOpened = () => {
      setIsProjectOpen(true);
    };

    const handleProjectClosed = () => {
      setIsProjectOpen(false);
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
