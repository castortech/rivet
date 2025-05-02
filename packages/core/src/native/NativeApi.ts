import { type BaseDir } from './BaseDir.js';

export type ReadDirOptions = {
  recursive?: boolean;
  includeDirectories?: boolean;
  filterGlobs?: string[];
  relative?: boolean;
  ignores?: string[];
};

export type Status =
  | { success: true }
  | { success: false; error: unknown }

export interface NativeApi {
	createdir(path: string, recursive?: boolean, baseDir?: BaseDir): Promise<Status>;

  readdir(path: string, baseDir?: BaseDir, options?: ReadDirOptions): Promise<string[]>;

  readTextFile(path: string, baseDir?: BaseDir): Promise<string>;

  readBinaryFile(path: string, baseDir?: BaseDir): Promise<Blob>;

  writeTextFile(path: string, data: string, baseDir?: BaseDir): Promise<Status>;

	writeBinaryFile(path: string, data: Uint8Array, baseDir?: BaseDir): Promise<Status>;

	exists(path: string, baseDir?: BaseDir): Promise<boolean>;

	join(...paths: string[]): Promise<string>;

	uniqueFilename(path: string, baseDir?: BaseDir): Promise<string>;

  exec(command: string, args: string[], options?: { cwd?: string }): Promise<void>;
}
