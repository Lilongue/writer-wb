import { NarrativeService } from './services/NarrativeService';
import { WorldObjectService } from './services/WorldObjectService';
import { TemplateService } from './services/TemplateService';
import ConnectionService from './services/ConnectionService';
import { ManuscriptService } from './services/ManuscriptService';
import ProjectSettingsService from './services/ProjectSettingsService';
import { NarrativeDao } from './data/daos/NarrativeDao';
import { WorldObjectDao } from './data/daos/WorldObjectDao';
import { TemplateDao } from './data/daos/TemplateDao';
import { ConnectionDao } from './data/daos/ConnectionDao';
import { SettingsDao } from './data/daos/SettingsDao';
import ImportExportService from './services/ImportExportService';
import projectService from './services/ProjectService';

const getDb = () => projectService.getDb();

export const narrativeDao = new NarrativeDao(getDb);
export const worldObjectDao = new WorldObjectDao(getDb);
export const templateDao = new TemplateDao(getDb);
export const connectionDao = new ConnectionDao(getDb);
export const settingsDao = new SettingsDao(getDb);

export const narrativeService = new NarrativeService(
  narrativeDao,
  templateDao,
  () => projectService.getProjectRoot(),
);
export const manuscriptService = new ManuscriptService(narrativeDao, () =>
  projectService.getProjectRoot(),
);
export const worldObjectService = new WorldObjectService(
  worldObjectDao,
  templateDao,
  () => projectService.getProjectRoot(),
);
export const templateService = new TemplateService(templateDao, worldObjectDao);
export const connectionService = new ConnectionService(
  connectionDao,
  narrativeDao,
  worldObjectDao,
);
export const projectSettingsService = new ProjectSettingsService(settingsDao);
export const importExportService = new ImportExportService(
  projectSettingsService,
  templateDao,
  worldObjectDao,
  connectionDao,
);
