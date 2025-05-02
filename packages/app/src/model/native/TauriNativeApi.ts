import { readDir, BaseDirectory, readTextFile, readBinaryFile, writeFile, writeBinaryFile, type FileEntry, createDir, exists } from '@tauri-apps/api/fs';
import { basename, dirname, extname, join } from '@tauri-apps/api/path'
import { type Status, type BaseDir, type NativeApi, type ReadDirOptions } from '@ironclad/rivet-core';

import { minimatch } from 'minimatch';

const baseDirToBaseDirectoryMap: Record<BaseDir, BaseDirectory> = {
  app: BaseDirectory.App,
  appCache: BaseDirectory.AppCache,
  appConfig: BaseDirectory.AppConfig,
  appData: BaseDirectory.AppData,
  appLocalData: BaseDirectory.AppLocalData,
  appLog: BaseDirectory.AppLog,
  audio: BaseDirectory.Audio,
  cache: BaseDirectory.Cache,
  config: BaseDirectory.Config,
  data: BaseDirectory.Data,
  desktop: BaseDirectory.Desktop,
  document: BaseDirectory.Document,
  download: BaseDirectory.Download,
  executable: BaseDirectory.Executable,
  font: BaseDirectory.Font,
  home: BaseDirectory.Home,
  localData: BaseDirectory.LocalData,
  log: BaseDirectory.Log,
  picture: BaseDirectory.Picture,
  public: BaseDirectory.Public,
  resource: BaseDirectory.Resource,
  runtime: BaseDirectory.Runtime,
  temp: BaseDirectory.Temp,
  template: BaseDirectory.Template,
  video: BaseDirectory.Video,
};
const baseDirToBaseDirectory = (baseDir?: string): BaseDirectory | undefined =>
  baseDir ? baseDirToBaseDirectoryMap[baseDir as BaseDir] : undefined;

export class TauriNativeApi implements NativeApi {
	async createdir(path: string, recursive?: boolean, baseDir?: BaseDir): Promise<Status> {
	  try {
			const baseDirectory = baseDirToBaseDirectory(baseDir);
			await createDir(path, { dir: baseDirectory, recursive });
			return { success: true }
		} catch (error) {
			return { success: false, error }
		}
	}

  async readdir(path: string, baseDir?: BaseDir, options: ReadDirOptions = {}): Promise<string[]> {
    const { recursive = false, includeDirectories = false, filterGlobs = [], relative = false, ignores = [] } = options;

    const baseDirectory = baseDirToBaseDirectory(baseDir);
    const results = await readDir(path, { dir: baseDirectory, recursive });

    const flattenResults: (r: FileEntry[]) => FileEntry[] = (r) =>
      r.flatMap((result) => (result.children ? [result, ...flattenResults(result.children)] : [result]));

    let filteredResults = flattenResults(results)
      .filter((result) => (includeDirectories ? true : result.children == null))
      .map((result) => result.path);

    if (filterGlobs.length > 0) {
      for (const glob of filterGlobs) {
        filteredResults = filteredResults.filter((result) => minimatch(result, glob, { dot: true }));
      }
    }

    if (ignores.length > 0) {
      for (const ignore of ignores) {
        filteredResults = filteredResults.filter((result) => !minimatch(result, ignore, { dot: true }));
      }
    }

    // TODO approximate, will fail on ironclad/ironclad for example
    filteredResults = filteredResults.map((result) =>
      relative ? result.slice(result.indexOf(path) + path.length + 1) : result,
    );

    return filteredResults;
  }

  async readTextFile(path: string, baseDir?: BaseDir): Promise<string> {
    const baseDirectory = baseDirToBaseDirectory(baseDir);
    const result = await readTextFile(path, { dir: baseDirectory });
    return result;
  }

  async readBinaryFile(path: string, baseDir?: BaseDir): Promise<Blob> {
    const baseDirectory = baseDirToBaseDirectory(baseDir);
    const result = await readBinaryFile(path, { dir: baseDirectory });
    return new Blob([result]);
  }

  async writeTextFile(path: string, data: string, baseDir?: BaseDir): Promise<Status> {
	  try {
			const baseDirectory = baseDirToBaseDirectory(baseDir);
			await writeFile(path, data, { dir: baseDirectory });
			return { success: true }
		} catch (error) {
			return { success: false, error }
		}
  }

  async writeBinaryFile(path: string, data: Uint8Array, baseDir?: BaseDir): Promise<Status> {
	  try {
  	  const baseDirectory = baseDirToBaseDirectory(baseDir);
    	await writeBinaryFile(path, data, { dir: baseDirectory });
			return { success: true }
		} catch (error) {
			return { success: false, error }
		}
  }

	async exists(path: string, baseDir?: BaseDir): Promise<boolean> {
	  const baseDirectory = baseDirToBaseDirectory(baseDir);
		return exists(path, { dir: baseDirectory });
	}

	async join(...paths: string[]): Promise<string> {
		return await join(...paths);
	}

	async uniqueFilename(path: string, baseDir?: BaseDir): Promise<string> {
	  const baseDirectory = baseDirToBaseDirectory(baseDir);
		const dir = await dirname(path)
  	const rawExt = await extname(path)
  	const ext = rawExt ? `.${rawExt}` : ''
  	const base = await basename(path, ext)

		let candidate = path;
		let counter = 1;

		while (await exists(candidate, { dir: baseDirectory })) {
			candidate = await join(dir, `${base}(${counter})${ext}`);
			counter++;
		}

		return candidate;
	}

  async exec(command: string, args: string[], options?: { cwd?: string | undefined } | undefined): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
