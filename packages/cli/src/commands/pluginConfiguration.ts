import { plugins } from '@ironclad/rivet-core'

type RivetType = {
	globalRivetNodeRegistry: {
		registerPlugin: (plugin: unknown) => void
	}
}

type PluginFactory = (Rivet: RivetType) => unknown

type PluginConfig = {
	envVar: string
	importPath?: string
	isBuiltIn: boolean
	registerFunction: (plugin:PluginFactory, Rivet: RivetType) => void

	settings: {
		envVarPrefix: string
		settingsKey: string
		settingsStructure?: Record<string, string>
	}
}

const pluginConfigurations: PluginConfig[] = [
	{
		envVar: 'AIDON_PLUGIN',
		isBuiltIn: true,
		registerFunction: (_plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugins.aidon),
		settings: {
			envVarPrefix: 'AIDON',
			settingsKey: 'aidon'
		},
	},
	{
		envVar: 'ANTHROPIC_PLUGIN',
		isBuiltIn: true,
		registerFunction: (_plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugins.anthropic),
		settings: {
				envVarPrefix: 'ANTHROPIC',
				settingsKey: 'anthropic',
				settingsStructure: {
					anthropicApiKey: 'API_KEY',
					anthropicApiEndpoint: 'API_ENDPOINT',
				},
		},
	},
	{
		envVar: 'ASSEMBLYAI_PLUGIN',
		isBuiltIn: true,
		registerFunction: (_plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugins.assemblyAi),
		settings: {
			envVarPrefix: 'ASSEMBLYAI',
			settingsKey: 'assemblyAi',
			settingsStructure: {
				assemblyAiApiKey: 'API_KEY',
			},
		},
	},
	{
		envVar: 'AUTOEVALS_PLUGIN',
		isBuiltIn: true,
		registerFunction: (_plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugins.autoevals),
		settings: {
			envVarPrefix: 'AUTOEVALS',
			settingsKey: 'autoevals'
		},
	},
	{
		envVar: 'CHROMA_PLUGIN',
		importPath: 'rivet-plugin-chromadb',
		isBuiltIn: false,
		registerFunction: (plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugin(Rivet)),
		settings: {
			envVarPrefix: 'CHROMA',
			settingsKey: 'chroma',
			settingsStructure: {
				databaseUri: 'DATABASE_URI',
			},
		},
	},
	{
		envVar: 'GENTRACE_PLUGIN',
		isBuiltIn: true,
		registerFunction: (_plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugins.gentrace),
		settings: {
			envVarPrefix: 'GENTRACE',
			settingsKey: 'gentrace',
			settingsStructure: {
				gentraceApiKey: 'API_KEY',
			},
		},
	},
	{
		envVar: 'GOOGLE_PLUGIN',
		isBuiltIn: true,
		registerFunction: (_plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugins.google),
		settings: {
			envVarPrefix: 'GOOGLE',
			settingsKey: 'google',
			settingsStructure: {
				googleApiKey: 'API_KEY',
				googleProjectId: 'PROJECT_ID',
				googleRegion: 'REGION',
				googleApplicationCredentials: 'APPLICATION_CREDENTIALS',
			},
		},
	},
	{
		envVar: 'HUGGINGFACE_PLUGIN',
		isBuiltIn: true,
		registerFunction: (_plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugins.huggingFace),
		settings: {
			envVarPrefix: 'HUGGINGFACE',
			settingsKey: 'huggingface',
			settingsStructure: {
				huggingFaceAccessToken: 'ACCESS_TOKEN',
			},
		},
	},
	{
		envVar: 'MONGODB_PLUGIN',
		importPath: 'rivet-plugin-mongodb',
		isBuiltIn: false,
		registerFunction: (plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugin(Rivet)),
		settings: {
			envVarPrefix: 'MONGODB',
			settingsKey: 'mongoDB',
			settingsStructure: {
				mongoDBConnectionString: 'CONNECTION_STRING',
			},
		},
	},
	{
		envVar: 'OLLAMA_PLUGIN',
		importPath: 'rivet-plugin-ollama',
		isBuiltIn: false,
		registerFunction: (plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugin(Rivet)),
		settings: {
			envVarPrefix: 'OLLAMA',
			settingsKey: 'ollama',
			settingsStructure: {
				host: 'HOST',
			},
		},
	},
	{
		envVar: 'OPENAI_PLUGIN',
		isBuiltIn: true,
		registerFunction: (_plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugins.openai),
		settings: {
			envVarPrefix: 'OPENAI',
			settingsKey: 'openai',
		},
	},
	{
		envVar: 'PDF2MD_PLUGIN',
		importPath: 'rivet-plugin-pdf2md',
		isBuiltIn: false,
		registerFunction: (plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugin(Rivet)),
		settings: {
			envVarPrefix: 'PDF2MD',
			settingsKey: 'pdf2md',
		},
	},
	{
		envVar: 'PINECONE_PLUGIN',
		isBuiltIn: true,
		registerFunction: (_plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugins.pinecone),
		settings: {
			envVarPrefix: 'PINECONE',
			settingsKey: 'pinecone',
			settingsStructure: {
				pineconeApiKey: 'API_KEY',
			},
		},
	},
	{
		envVar: 'QDRANT_PLUGIN',
		importPath: 'rivet-plugin-qdrant',
		isBuiltIn: false,
		registerFunction: (plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugin(Rivet)),
		settings: {
			envVarPrefix: 'QDRANT',
			settingsKey: 'qdrant',
			settingsStructure: {
				qdrantApiKey: 'API_KEY',
				qdrantUrl: 'URL',
			},
		},
	},
	{
		envVar: 'TRANSFORMERLAB_PLUGIN',
		importPath: 'rivet-plugin-transformerlab',
		isBuiltIn: false,
		registerFunction: (plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugin(Rivet)),
		settings: {
			envVarPrefix: 'TRANSFORMERLAB',
			settingsKey: 'transformerlab',
			settingsStructure: {
				host: 'HOST',
			},
		},
	},
	{
		envVar: 'UTILITIES_PLUGIN',
		importPath: 'rivet-utilities-plugin',
		isBuiltIn: false,
		registerFunction: (plugin, Rivet) => Rivet.globalRivetNodeRegistry.registerPlugin(plugin(Rivet)),
		settings: {
			envVarPrefix: 'UTILITIES',
			settingsKey: 'utilities',
		},
	},
];

const registeredPlugins: Record<string, boolean> = {};

export async function setupPlugins(Rivet: RivetType): Promise<Record<string, Record<string, string>>> {
	const pluginSettings: Record<string, Record<string, string>> = {};
	console.log("Starting plugin registration...")

	for (const config of pluginConfigurations) {
		if (process.env[config.envVar] === 'true') {
			// Skip registration if the plugin has already been registered
			if (registeredPlugins[config.settings.settingsKey]) {
				console.log(`${config.settings.settingsKey} plugin already registered.`);
			}

			let plugin: PluginFactory | null = null;
			if (!config.isBuiltIn) {
				const module = await import(config.importPath!);
				plugin = module.default ?? module;
			}

			try {
				// Perform registration if the plugin hasn't been registered yet
				if (!registeredPlugins[config.settings.settingsKey]) {
					config.registerFunction(plugin as PluginFactory, Rivet);
					console.log(`Successfully registered ${config.settings.settingsKey} plugin.`);
					// Mark plugin as registered
					registeredPlugins[config.settings.settingsKey] = true;
				}
			} catch (error: any) {
				console.warn(`Failed to register ${config.settings.settingsKey} plugin: ${error.message}`)
			}

			// Prepare plugin-specific settings if needed
			const pluginSpecificSettings: Record<string, string> = {};
			const missingEnvVars: string[] = [];

			if (config.settings?.settingsStructure) {
				for (const [settingKey, envSuffix] of Object.entries(config.settings.settingsStructure)) {
					// Construct the full environment variable name
					const fullEnvName = `${config.settings.envVarPrefix}_${envSuffix}`;
					// Fetch the value from the environment variables
					const value = process.env[fullEnvName];

					if (value !== undefined) {
						pluginSpecificSettings[settingKey] = value;
					} else {
						missingEnvVars.push(fullEnvName); // Add missing env var to the list
					}
				}

				if (missingEnvVars.length > 0) {
					// Log missing environment variables as a warning
					console.warn(`[Warning] Missing environment variables for the '${config.settings.settingsKey}' \
							plugin: ${missingEnvVars.join(', ')}.`);
				}

				// Assign the settings to the appropriate key in pluginSettings
				if (Object.keys(pluginSpecificSettings).length > 0) {
					pluginSettings[config.settings.settingsKey] = pluginSpecificSettings;
				}
			}
		}
	}

	// Optionally, log a summary or a positive confirmation message at the end
	console.log("Plugin registration complete.");

	return pluginSettings;
}

export function logAvailablePluginsInfo() {
	console.log("Available Plugins and Required Environment Variables:")
	console.log("-----------------------------------------------------")
	pluginConfigurations.forEach(config => {
		// Log the plugin's activation environment variable
		console.log(`Plugin: ${config.settings.settingsKey}`);
		if (process.env[config.envVar] === 'true') {
			console.log(`  Already marked for activation with env var: ${config.envVar} set to 'true'`)
		}
		else {
			console.log(`  Activate with env var: ${config.envVar} (set to 'true' to enable)`)
		}

		// Check and log required environment variables for settings
		if (config.settings?.settingsStructure) {
			Object.entries(config.settings.settingsStructure).forEach(([settingKey, envSuffix]) => {
				const fullEnvName = `${config.settings.envVarPrefix}_${envSuffix}`
				const valueExist = process.env[fullEnvName] !== undefined && process.env[fullEnvName] !== ''
				console.log(`  Required env var for ${settingKey}: ${fullEnvName} ${valueExist ? ' (has value)' : ''}`)
			});
		}
		console.log("-----------------------------------------------------")
	})
}
