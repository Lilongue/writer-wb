import { useState, useEffect } from 'react';
import './App.css';
import 'rc-tree/assets/index.css';
import NarrativeTree from './components/NarrativeTree';

export default function App() {
  const [projectState, setProjectState] = useState({ isOpen: false, key: 0 });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    const cleanupOpened = window.electron.ipcRenderer.on(
      'project-opened',
      () => {
        setProjectState((prevState) => ({
          isOpen: true,
          key: prevState.key + 1,
        }));
      },
    );

    const cleanupClosed = window.electron.ipcRenderer.on(
      'project-closed',
      () => {
        setProjectState({ isOpen: false, key: 0 });
        setSelectedItemId(null);
      },
    );

    return () => {
      cleanupOpened();
      cleanupClosed();
    };
  }, []);

  return (
    <div>
      {projectState.isOpen ? (
        <NarrativeTree
          key={projectState.key}
          onSelect={(id) => setSelectedItemId(id)}
        />
      ) : (
        <div className="sidebar">
          <h2>Project</h2>
          <p>No project open. Use File - New/Open Project.</p>
        </div>
      )}

      <div className="content">
        <h2>Content</h2>
        <p>Selected Item ID: {selectedItemId || 'None'}</p>
      </div>
    </div>
  );
}
