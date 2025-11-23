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

export class AidonSDK {
  private readonly apiBaseUrl: string
  private readonly apiKey: string

  constructor(apiBaseUrl: string, apiKey: string) {
    this.apiBaseUrl = apiBaseUrl
		this.apiKey = apiKey
  }

	private getHeaders(contentType = 'application/json'): Record<string, string> {
		if (!this.apiKey) throw new Error('Authenticate first')
		return {
			'accept': '*/*',
			'Authorization': `Bearer ${this.apiKey}`,
			'accept-language': 'en-US,en',
			'Content-Type': contentType,
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		}
	}

  async getUser() {
		const url = `${this.apiBaseUrl}/api/rivet/getUser`
		const options: FetchOptions = {
			method: 'GET',
			headers: this.getHeaders()
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error getting user info from Aidon: ${resp.status}`)
		try {
			return JSON.parse(resp.body) as { fbUrl: string, fbUser: string, fbPassword: string }
		} catch (error) {
			this.handleError(error, `Failed to parse user info:`)
		}
  }

  async createModel(filePath: string, fileName: string, fbUserId?: number, workspaceId?: string): Promise<void> {
		const url = `${this.apiBaseUrl}/api/rivet/publish`
		const options: FetchOptions = {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({
				filePath,
				fileName,
				fbUserId,
				workspaceId
			})
		}
		const resp = await this.tauriFetch(url, options)
		if (!this.isOk(resp.status)) throw new Error(`Error creating Aidon Model: ${resp.status}`)
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