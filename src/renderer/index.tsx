import { createRoot } from 'react-dom/client';
import App from './App';
import { ProjectProvider } from './contexts/ProjectContext';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
  <ProjectProvider>
    <App />
  </ProjectProvider>,
);
