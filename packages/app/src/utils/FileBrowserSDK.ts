import { jwtDecode } from 'jwt-decode';
import { invoke } from '@tauri-apps/api/tauri'

interface FetchOptions {
  method: string
  headers?: Record<string, string>
  body?: string | File
  redirect?: 'manual'  // Optional; only 'manual' for now (disables auto-follow)
  referrer?: string   // Optional; sets Referer header
}

interface TauriResponse {
  status: number
  headers: Record<string, string>
  body: string
  is_base64: boolean
}

export interface UploadResult {
  name: string
  folder: string
  path: string
  fullPath: string
  size: number
  type: string
  modified: string
  downloadLink: string
  url: string
}

export interface ShareableLink {
  url: string
  downloadLink: string
}

export type FileItem = {
  path: string
  name: string
  size: number
  extension: string
  modified: string
  mode: number
  isDir: boolean
  isSymlink: boolean
  type: string
	content?: string
}

export type FileResources = {
  items: FileItem[]
  numDirs: number
  numFiles: number
  sorting: {
    by: string
    asc: boolean
  }
  path: string
  name: string
  size: number
  extension: string
  modified: string
  mode: number
  isDir: boolean
  isSymlink: boolean
  type: string
}

export type ViewMode = 'list' | 'mosaic' | 'mosaic gallery';

export interface Permissions {
  admin: boolean;
  execute: boolean;
  create: boolean;
  rename: boolean;
  modify: boolean;
  delete: boolean;
  share: boolean;
  download: boolean;
}

export interface UserInfo {
  id: number;
  locale: string;
  viewMode: ViewMode;
  singleClick: boolean;
  perm: Permissions;
  commands: string[];
  lockPassword: boolean;
  hideDotfiles: boolean;
  dateFormat: boolean;
  username: string;
  aceEditorTheme: string;
}

interface JWTPayload {
  user: UserInfo;
  iss: string;
  exp: number;
  iat: number;
}

export class FileBrowserSDK {
  private readonly apiBaseUrl: string
  private authToken: string | null = null
  private userInfo: UserInfo | null = null

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl
  }

	getUserInfo() : UserInfo | null {
		return this.userInfo
	}

  async authenticate(username: string, password: string): Promise<void> {
		const url = `${this.apiBaseUrl}/api/login`
		const options: FetchOptions = {
			method: 'PUT',
			headers: {
        accept: '*/*',
        'accept-language': 'en-US,en',
        'content-type': 'text/plain'
      },
      body: JSON.stringify({ username, password, recaptcha: '' })
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Authentication failed: ${resp.status}`)
		this.authToken = resp.body
		const decoded = jwtDecode<JWTPayload>(this.authToken);
		this.userInfo = decoded.user;
    // const data = await resp.json()
    // this.authToken = data.token ?? data
  }

	async renew(): Promise<void> {
		const url = `${this.apiBaseUrl}/api/renew`
		const options: FetchOptions = {
			method: 'POST',
			headers: this.getHeaders()
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Authentication failed: ${resp.status}`)
		//Update token & userInfo
		this.authToken = resp.body
		const decoded = jwtDecode<JWTPayload>(this.authToken);
		this.userInfo = decoded.user;
	}

	private getHeaders(contentType = 'application/json'): Record<string, string> {
		if (!this.authToken) throw new Error('Authenticate first')
		return {
			'accept': '*/*',
			'x-auth': this.authToken,
			'accept-language': 'en-US,en',
			'sec-gpc': '1',
			'tus-resumable': '1.0.0',
			'Content-Type': contentType,
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		}
	}

  async createFile(filePath: string): Promise<FileItem> {
		{
			const url = `${this.apiBaseUrl}/api/resources/${encodeURIComponent(filePath)}?override=false`
			const options: FetchOptions = {
				method: 'POST',
				headers: this.getHeaders()
			}
			await this.tauriFetch(url, options)
		}

		const url = `${this.apiBaseUrl}/api/resources/${encodeURIComponent(filePath)}`
		const options: FetchOptions = {
			method: 'GET',
			headers: this.getHeaders()
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error creating file: ${resp.status}`)

		let data: FileItem
		try {
			data = JSON.parse(resp.body) as FileItem
		} catch (error) {
			this.handleError(error, `Failed to parse API response:`)
		}
		return data
  }

  async createFolder(folderPath: string): Promise<FileItem> {
		{
			const url = `${this.apiBaseUrl}/api/resources/${encodeURIComponent(folderPath)}/?override=false`
			const options: FetchOptions = {
				method: 'POST',
				headers: this.getHeaders()
			}
			const resp = await this.tauriFetch(url, options)
			if (!this.isOk(resp.status)) throw new Error(`Error configuring create file op: ${resp.status}`)
		}

		const url = `${this.apiBaseUrl}/api/resources/${encodeURIComponent(folderPath)}/`
		const options: FetchOptions = {
			method: 'GET',
			headers: this.getHeaders()
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error creating folder: ${resp.status}`)

		let data: FileItem
		try {
			data = JSON.parse(resp.body) as FileItem
		} catch (error) {
			this.handleError(error, `Failed to parse API response:`)
		}
		return data
  }

  async deleteFile(filePath: string): Promise<boolean> {
    const url = `${this.apiBaseUrl}/api/resources/${encodeURIComponent(filePath)}`
    const options: FetchOptions = {
      method: 'DELETE',
      headers: this.getHeaders()
    }
    const resp = await this.tauriFetch(url, options)
    if (!this.isOk(resp.status)) throw new Error(`Error deleting file: ${resp.status}`)
    return true
  }

  async deleteFolder(folderPath: string): Promise<boolean> {
    const url = `${this.apiBaseUrl}/api/resources/${encodeURIComponent(folderPath)}/`
    const options: FetchOptions = {
      method: 'DELETE',
      headers: this.getHeaders()
    }
    const resp = await this.tauriFetch(url, options)
    if (!this.isOk(resp.status)) throw new Error(`Error deleting folder: ${resp.status}`)
    return true
  }

  async uploadFile(
    file: File,
    folderPath: string
  ): Promise<UploadResult | undefined> {
    try {
      const fileName = `${file.name}_${Date.now()}`
      const uploadUrl = `${this.apiBaseUrl}/api/tus/${folderPath}/${encodeURIComponent(fileName)}?override=false`

      // 1. init (create upload)
			{
				const options: FetchOptions = {
					method: 'POST',
					headers: this.getHeaders(),
					redirect: 'manual',
					referrer: `${this.apiBaseUrl}/files/${folderPath}`
				}
				const resp = await this.tauriFetch(uploadUrl, options)
				if (!this.isOk(resp.status)) throw new Error(`Error configuring upload file op: ${resp.status}`)
			}

      // 2. get current offset (always 0 for browser)
			{
				const options: FetchOptions = {
					method: 'HEAD',
					headers: this.getHeaders(),
					redirect: 'manual',
	        referrer: `${this.apiBaseUrl}/files/${folderPath}`
				}
				const resp = await this.tauriFetch(uploadUrl, options)
				if (!this.isOk(resp.status)) throw new Error(`Error in upload file getting current offset: ${resp.status}`)
			}

      // 3. upload file
      const patchHeaders = this.getHeaders('application/offset+octet-stream')
			patchHeaders['upload-offset'] = '0'
			patchHeaders['content-length'] = file.size.toString()
			patchHeaders['tus-resumable'] = '1.0.0'
			patchHeaders['Referer'] = `${this.apiBaseUrl}/files/${folderPath}`
			const options: FetchOptions = {
        method: 'PATCH',
        headers: patchHeaders,
        body: file
			}
			const patchResp = await this.tauriFetch(uploadUrl, options)

			if (patchResp.status === 204) {
        const fileDetails = await this.getFileDetails(
          `${folderPath}/${fileName}`
        )
        const sharableLink = await this.getSharableLink(fileDetails.path)
        return {
          name: fileDetails.name,
          folder: folderPath,
          path: fileDetails.path,
          fullPath: `${this.apiBaseUrl}/files${fileDetails.path}`,
          size: fileDetails.size,
          type: fileDetails.type,
          modified: fileDetails.modified,
          downloadLink: sharableLink?.downloadLink ?? '',
          url: sharableLink?.url ?? ''
        }
      }
      throw new Error('Upload incomplete or failed')
    } catch (error) {
      this.handleError(error, `Error uploading file: ${file.name}`)
    }
  }

  async setFileContent(filePath: string, data:string): Promise<void> {
		const url = `${this.apiBaseUrl}/api/resources/${encodeURIComponent(filePath)}`
		const options: FetchOptions = {
      method: 'PUT',
			headers: this.getHeaders('text/plain;charset=UTF-8'),
			body: data
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error setting file content: ${resp.status}`)
  }

	async downloadFile(filePath: string, fileName:string): Promise<{ blob: Blob, contentType: string }> {
		const origin = encodeURIComponent(`${filePath}/${fileName}`);
		const url = `${this.apiBaseUrl}/api/raw/${origin}`
		const options: FetchOptions = {
      method: 'GET',
			headers: this.getHeaders('text/plain;charset=UTF-8')
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error retrieving file: ${resp.status}`)

		const contentType = resp.headers['content-type'] || 'application/octet-stream'
		const blob = new Blob([resp.body], { type: contentType })

		return { blob, contentType }
  }

  async copyFile(fromFolderPath: string, fileName:string, toFolderPath: string): Promise<boolean> {
		const origin = encodeURIComponent(`${fromFolderPath}/${fileName}`);
		const destination = encodeURIComponent(`${toFolderPath}/${fileName}`);
		const rename: boolean = fromFolderPath === toFolderPath;
		const url = `${this.apiBaseUrl}/api/resources/${origin}?action=copy&destination=${destination}&override=false&rename=${rename}`
		const options: FetchOptions = {
      method: 'PATCH',
			headers: this.getHeaders()
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error copying file: ${resp.status}`)
		return true
  }

  async getSharableLink(filePath: string): Promise<ShareableLink | null> {
    // GET is not needed in browser version, just POST
		const url = `${this.apiBaseUrl}/api/share${encodeURIComponent(filePath)}`
		const options: FetchOptions = {
      method: 'POST',
			headers: this.getHeaders()
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error getting sharable link: ${resp.status}`)

		let data
		try {
			data = JSON.parse(resp.body)
		} catch (error) {
			this.handleError(error, `Failed to parse API response:`)
		}

    if (!data) return null
    return {
      url: `${this.apiBaseUrl}/share/${data.hash}`,
      downloadLink: `${this.apiBaseUrl}/api/public/dl/${data.hash}${data.path}`
    }
  }

  async renameFile(folderPath: string, fileName: string, newName: string): Promise<void> {
    const filePath = encodeURIComponent(`${folderPath}/${fileName}`.replaceAll(/\/+/g, '/'))
    const newFilePath = encodeURIComponent(`${folderPath}/${newName}`.replaceAll(/\/+/g, '/'))
		const url = `${this.apiBaseUrl}/api/resources/${filePath}?action=rename&destination=${newFilePath}`
		const options: FetchOptions = {
      method: 'PATCH',
			headers: this.getHeaders()
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error copying file: ${resp.status}`)
  }

  async fileExist(filePath: string): Promise<boolean> {
		try {
			await this.getFileDetails(filePath);
			return true;
		} catch (error) {
			return false;
		}
	}

  async getFileDetails(filePath: string): Promise<FileItem> {
		const url = `${this.apiBaseUrl}/api/resources/${encodeURIComponent(filePath)}`
		const options: FetchOptions = {
			method: 'GET',
			headers: this.getHeaders()
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error fetching file details: ${resp.status}`)

		let data: FileItem
		try {
			data = JSON.parse(resp.body) as FileItem
		} catch (error) {
			this.handleError(error, `Failed to parse API response:`)
		}
		return data
  }

  async getFilesInFolder(folderPath: string): Promise<FileResources> {
		const url = `${this.apiBaseUrl}/api/resources/${encodeURIComponent(folderPath)}`
		const options: FetchOptions = {
			method: 'GET',
			headers: this.getHeaders()
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error fetching files in folder: ${resp.status}`)

		let data: FileResources
		try {
			data = JSON.parse(resp.body) as FileResources
		} catch (error) {
			this.handleError(error, `Failed to parse API response:`)
		}
		return data
  }

	/**
	 *
	 * @param sortBy name, modified, size
	 * @param asc
	 */
  async setSortMode(sortBy: string, asc:boolean): Promise<void> {
		const url = `${this.apiBaseUrl}/api/users/${this.userInfo?.id}`
		const options: FetchOptions = {
      method: 'POST',
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en',
        'content-type': 'application/json'
      },
			body: JSON.stringify({
				what: 'user',
				which: ['sorting'],
				data: {
					id: this.userInfo?.id,
					sorting: {
						by: sortBy,
						asc: asc
					}
				}
			})
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error setting sort mode: ${resp.status}`)
  }

	isAdmin(): boolean {
		return this.userInfo?.perm.admin ?? false;
	}

  async ensureValidToken(): Promise<boolean> {
    if (!this.authToken) {
			return false;
    }

    try {
      const decoded = jwtDecode<JWTPayload>(this.authToken);
      const currentTime = Math.floor(Date.now() / 1000);

      // If token is expired, we need to re-authenticate
      if (decoded.exp < currentTime) {
				return false;
      }

      // If token is expiring soon (within 5 minutes), renew it
      if (decoded.exp - currentTime < 300) {
        await this.renew();
      }
			return true;
    } catch (error) {
			console.error(error);
			return false;
    }
  }

	private isOk(status: number): boolean {
		return status >= 200 && status < 300
	}

  private handleError(error: unknown, context: string): never {
    let message = context
    if (error instanceof Error) message += ` - ${error.message}`
    // Optionally log more, but don't leak sensitive info
    throw new Error(message)
  }

	async tauriFetch(url: string, options: FetchOptions): Promise<TauriResponse> {
		const headersArray = options.headers ? Object.entries(options.headers) : []
		const responseJson = await invoke<string>('fetch_from_api', {  // Explicitly type as string
			url,
			method: options.method,
			body: options.body,
			headers: headersArray
		})

		try {
			return JSON.parse(responseJson) as TauriResponse  // Parse here; throw if invalid
		} catch (error) {
			this.handleError(error, `Failed to parse API response:`)
		}
	}
}