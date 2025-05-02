import { type BaseDir } from './BaseDir.js';
import { type NativeApi, type Status } from './NativeApi.js';

export class BrowserNativeApi implements NativeApi {
	createdir(_path: string, _recursive?: boolean, _baseDir?: BaseDir): Promise<Status> {
		throw new Error('Method not implemented.');
	}

  readdir(_path: string, _baseDir: BaseDir): Promise<string[]> {
    throw new Error('Method not implemented.');
  }

  readTextFile(_path: string, _baseDir: BaseDir): Promise<string> {
    throw new Error('Method not implemented.');
  }

  readBinaryFile(_path: string, _baseDir: BaseDir): Promise<Blob> {
    throw new Error('Method not implemented.');
  }

  writeTextFile(_path: string, _data: string, _baseDir?: BaseDir): Promise<Status> {
    throw new Error('Method not implemented.');
  }

	writeBinaryFile(_path: string, _data: Uint8Array, _baseDir?: BaseDir): Promise<Status> {
		throw new Error('Method not implemented.');
	}

	exists(_path: string, _baseDir?: BaseDir): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	join(..._paths: string[]): Promise<string> {
		throw new Error('Method not implemented.');
	}

	uniqueFilename(_path: string, _baseDir?: BaseDir): Promise<string> {
		throw new Error('Method not implemented.');
	}

  exec(): Promise<void> {
    throw new Error('Method not supported.');
  }
}
