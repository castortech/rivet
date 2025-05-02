import { opendir, readdir, mkdir, readFile, writeFile, access, constants } from 'node:fs/promises';
import { lstatSync } from 'node:fs';
import { dirname, extname, basename, join, relative } from 'node:path';
import { type BaseDir, type NativeApi, type ReadDirOptions, type Status } from '@ironclad/rivet-core';
import { minimatch } from 'minimatch';

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const d of await opendir(dir)) {
    const entry = join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

export class NodeNativeApi implements NativeApi {
	async createdir(path: string, recursive?: boolean, _baseDir?: BaseDir): Promise<Status> {
		const recurse = recursive ?? false;
	  try {
			await mkdir(path, { recursive: recurse });
			return { success: true }
		} catch (error) {
			return { success: false, error }
		}
	}

  async readdir(path: string, _baseDir?: BaseDir, options: ReadDirOptions = {}): Promise<string[]> {
    const {
      recursive = false,
      includeDirectories = false,
      filterGlobs = [],
      relative: isRelative = false,
      ignores = [],
    } = options;

    let results: string[] = [];
    if (recursive) {
      for await (const entry of walk(path)) {
        results.push(entry);
      }
    } else {
      const dirents = await readdir(path, { withFileTypes: true });
      results = dirents.map((dirent) => join(path, dirent.name));
    }

    if (!includeDirectories) {
      results = results.filter((result) => lstatSync(result).isFile());
    }

    if (filterGlobs.length > 0) {
      for (const glob of filterGlobs) {
        results = results.filter((result) => minimatch(result, glob, { dot: true }));
      }
    }

    if (ignores.length > 0) {
      for (const ignore of ignores) {
        results = results.filter((result) => !minimatch(result, ignore, { dot: true }));
      }
    }

    if (isRelative) {
      results = results.map((result) => relative(path, result));
    }

    return results;
  }

  async readTextFile(path: string, _baseDir?: BaseDir): Promise<string> {
    const result = await readFile(path, 'utf-8');
    return result;
  }

  async readBinaryFile(path: string, _baseDir?: BaseDir): Promise<Blob> {
    const result = await readFile(path);

    return new Blob([result]);
  }

  async writeTextFile(path: string, data: string, _baseDir?: BaseDir): Promise<Status> {
	  try {
			await writeFile(path, data, 'utf-8');
			return { success: true }
		} catch (error) {
			return { success: false, error }
		}
  }

	async writeBinaryFile(path: string, data: Uint8Array, _baseDir?: BaseDir): Promise<Status> {  //NOSONAR type is different
	  try {
			await writeFile(path, data, 'utf-8');
			return { success: true }
		} catch (error) {
			return { success: false, error }
		}
	}

	async exists(path: string, _baseDir?: BaseDir): Promise<boolean> {
		try {
			await access(path, constants.F_OK)
			return true
		} catch {
			return false
		}
	}

	async join(...paths: string[]): Promise<string> {
		return join(...paths);
	}

	async uniqueFilename(path: string, _baseDir?: BaseDir): Promise<string> {
		const dir = dirname(path);
		const ext = extname(path);
		const base = basename(path, ext);

		let candidate = path;
		let counter = 1;

		while (await this.exists(candidate)) {
			candidate = join(dir, `${base}(${counter})${ext}`);
			counter++;
		}

		return candidate;
	}

  exec(_command: string, _args: string[], _options?: { cwd?: string | undefined } | undefined): Promise<void> {
    throw new Error('Not Implemented');
  }
}
