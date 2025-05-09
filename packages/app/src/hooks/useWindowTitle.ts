import { getVersion } from '@tauri-apps/api/app';
import { appWindow } from '@tauri-apps/api/window';
import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { projectState, loadedProjectState } from '../state/savedGraphs';

export function useWindowTitle() {
  const project = useAtomValue(projectState);
  const loadedProject = useAtomValue(loadedProjectState);

  useEffect(() => {
    (async () => {
      try {
        const currentVersion = await getVersion();
        await appWindow.setTitle(
          `Aidon Rivet ${currentVersion} - ${project.metadata.title} (${
            loadedProject?.path?.trim() ? loadedProject.path : 'Unsaved'
          })`,
        );
      } catch (err) {
        console.warn(`Failed to set window title, likely not running in Tauri: ${err}`);
      }
    })();
  }, [loadedProject, project.metadata.title]);
}
