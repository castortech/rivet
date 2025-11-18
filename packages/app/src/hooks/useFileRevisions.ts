import { useAtom, useAtomValue } from 'jotai';
import { loadedProjectState, projectState, projectContextState } from '../state/savedGraphs';
import { useEffect, useState } from 'react';
import { coerceTypeOptional, type DataValue, globalRivetNodeRegistry } from '@ironclad/rivet-core';
import { FileBrowserSDK, type FileItem } from '../utils/FileBrowserSDK';
import { getSerializedDatasets } from '../io/datasets';
import { useSaveProject } from '../hooks/useSaveProject';
import { useGetRivetUIContext } from './useGetRivetUIContext';
import { toast } from 'react-toastify';
import { AidonSDK } from '../utils/AidonSDK';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface VersionedFileSet {
	baseName: string;           // "imagemakerv3"
	timestamp: number;          // 1731668400000
	projectFile?: FileItem;     // .rivet-project file
	dataFile?: FileItem;        // .rivet-data file
}

export interface VersionHistoryItem {
  version: number;            // 10, 9, 8... (descending)
  revisedAt: number;          // timestamp
  projectFile?: FileItem;     // optional project file
  dataFile?: FileItem;        // optional data file
}

export function useProjectRevisions() {
	const NOT_PUBLISHED = 'Not published';
  const [currentVersion, setCurrentVersion] = useState<string>(NOT_PUBLISHED);

	const projState = useAtomValue(loadedProjectState);
	const [project] = useAtom(projectState);
	const [projectContext] = useAtom(projectContextState(project.metadata.id));
	const [aidonSdk, setAidonSdk] = useState<AidonSDK | undefined>(undefined);
	const [fbSdk, setFbSdk] = useState<FileBrowserSDK | undefined>(undefined);
  const [hasFBContext, setHasFBContext] = useState(false);

	const { saveProject } = useSaveProject();
	const getUIContext = useGetRivetUIContext();

	useEffect(() => {
	  setHasFBContext(!!fbSdk);
	}, [fbSdk, projectContext])

	useEffect(() => {
		const init = async () => {
			try {
				const { fbSdk, aidonSdk } = await authenticateApiSdks();
				setFbSdk(fbSdk);
				setAidonSdk(aidonSdk);
				const currVersion = await getCurrentVersion(fbSdk, aidonSdk);
				if (currVersion) {
					setCurrentVersion(currVersion);
				}
			} catch (error) {
				console.error(`Error authenticating with FileBrowser`);
			}
		};
		init();
	}, [])

	const authenticateApiSdks = async (fbSdk?:FileBrowserSDK, aidonSdk?:AidonSDK): Promise<{ fbSdk:FileBrowserSDK, aidonSdk:AidonSDK}> => {
		try {
			const plugins = globalRivetNodeRegistry.getPlugins();
			const aidonPlugin = plugins.find( p => p.id === 'aidon');

			if (!aidonPlugin) {
				throw new Error("Aidon plugin not found");
			}
			const context = await getUIContext({node: aidonPlugin});
			const fbUrl = context.getPluginConfig('fileBrowserURL') || 'https://ai-fb.aidon.ai';
			const fbUser = context.getPluginConfig('fileBrowserUsername');
			const fbPass = context.getPluginConfig('fileBrowserPassword');
			const aidonUrl = context.getPluginConfig('aidonURL') || 'https://app.aidon.ai';
			const aidonKey = context.getPluginConfig('aidonKey');

			if (!aidonKey) {
				throw new Error("Aidon API key not found, configure in plugin");
			}

			fbSdk ??= new FileBrowserSDK(fbUrl);

			if (fbSdk && fbUser && fbPass) {
				await fbSdk.authenticate(fbUser, fbPass)
						.then(() => {
						console.log("Authenticated successfully");
					})
					.catch((err: unknown) => {
						console.error("Authentication failed:", err);
						throw new Error("FileBrowser Authentication failed");
					});
			}

			aidonSdk ??= new AidonSDK(aidonUrl, aidonKey);

			return { fbSdk , aidonSdk };
		} catch (err) {
			throw err;
		}
	}

	const getContextInfo = (sdk?:FileBrowserSDK): { path: string, fileName: string } => {
		sdk ??= fbSdk;

		if (!sdk || !projState.loaded || !projState.path) {
			return {path:'', fileName:''}; //never called without testing these first
		}
		const fileName = projState.path.split(/[/\\]/).pop() ?? ''
		let path = '';

		if (sdk.isAdmin()) { //check if admin and if so add 'Rivet_Files' to the path
			path += '/Rivet_Files';
		}
		return { path, fileName}
	}

	const formatRevisionDate = (value?: string | number | Date): string => {
		if (value == null) return '';
		const date = new Date(value);
		return date.toLocaleString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const archiveCurrentVersion = async(
		timestamp: number,
		hasDataset: boolean
	) => {
		if (!fbSdk || !projState.loaded || !projState.path) {
			return;
		}

		const { path, fileName } = getContextInfo();

		// Copy current file to versions folder and rename it
		await fbSdk.copyFile(path, fileName, `${path}/versions`);
		await fbSdk.renameFile(`${path}/versions`, fileName, `${fileName}.${timestamp}`);

		if (hasDataset) {
			const dataFileName = fileName.replace('.rivet-project', '.rivet-data');
			if (await fbSdk.fileExist(`${path}/${dataFileName}`)) {  //might not exist if just added
				await fbSdk.copyFile(path, dataFileName, `${path}/versions`);
				await fbSdk.renameFile(`${path}/versions`, dataFileName, `${dataFileName}.${timestamp}`);
			}
		}
	}

	const getBaseName = (filename: string): string => {
		// "imagemakerv3.rivet-project" -> "imagemakerv3"
		return filename.replace(/\.(rivet-project|rivet-data)$/, '');
	}

	const groupVersionsByTimestamp = (
		allVersions: FileItem[],
		fileName: string  // "imagemakerv3.rivet-project"
	): VersionedFileSet[] => {
		const baseName = getBaseName(fileName);
		const timestampMap = new Map<number, VersionedFileSet>();

		const projectPrefix = `${baseName}.rivet-project.`;
		const dataPrefix = `${baseName}.rivet-data.`;

		for (const item of allVersions) {
			let timestamp: number | null = null;
			let fileType: 'project' | 'data' | null = null;

			if (item.name.startsWith(projectPrefix)) {
				timestamp = Number.parseInt(item.name.substring(projectPrefix.length));
				fileType = 'project';
			} else if (item.name.startsWith(dataPrefix)) {
				timestamp = Number.parseInt(item.name.substring(dataPrefix.length));
				fileType = 'data';
			}

			if (timestamp && !Number.isNaN(timestamp) && fileType) {
				if (!timestampMap.has(timestamp)) {
					timestampMap.set(timestamp, {
						baseName,
						timestamp,
					});
				}

				const versionSet = timestampMap.get(timestamp)!;
				if (fileType === 'project') {
					versionSet.projectFile = item;
				} else {
					versionSet.dataFile = item;
				}
			}
		}

		return Array.from(timestampMap.values())
			.sort((a, b) => b.timestamp - a.timestamp);
	}

	const cleanupOldVersions = async (hasDataset: boolean) => {
		if (!fbSdk || !projState.loaded || !projState.path) {
			return;
		}

		const { path, fileName } = getContextInfo();
		const allVersions = await fbSdk.getFilesInFolder(`${path}/versions`);
		const versions = groupVersionsByTimestamp(allVersions.items, fileName);
		const toDelete = versions.slice(10); // Keep only 10 most recent

		for (const version of toDelete) { // Delete both project and data files if they exist
			if (version.projectFile) {
				await fbSdk.deleteFile(`${path}/versions/${version.projectFile.name}`);
			}
			if (version.dataFile) {
				await fbSdk.deleteFile(`${path}/versions/${version.dataFile.name}`);
			}
		}
	}

	const createModelInAidon = async () => {
		if (!fbSdk || !aidonSdk || !projState.loaded || !projState.path) {
			return;
		}

		if (!await fbSdk.ensureValidToken()) {
			await authenticateApiSdks(fbSdk, aidonSdk);
		}
    try {
			const { path, fileName } = getContextInfo();
			const wsId = coerceTypeOptional(projectContext?.workspace_id?.value as DataValue, 'string');
			const workspaceId = wsId && wsId.length > 0 ? wsId : undefined
			const fbUserId = fbSdk.isAdmin() ? undefined : fbSdk.getUserInfo()?.id

			await aidonSdk.createModel(path, fileName, fbUserId, workspaceId)
		} catch (error) {
      console.error('Create Aidon model failed:', error);
    }
	}

	const publishProject = async () => {
		if (!fbSdk || !aidonSdk || !projState.loaded || !projState.path) {
			return;
		}

		if (!await fbSdk.ensureValidToken()) {
			await authenticateApiSdks(fbSdk, aidonSdk);
		}

		const data = await saveProject();
		if (data) {
			const timestamp = Date.now();
			const { path, fileName } = getContextInfo();
			const dataFileName = fileName.replace('.rivet-project', '.rivet-data');
			const datasetData = await getSerializedDatasets(projState.path, project);
			const hasDataset:boolean = datasetData !== undefined

			// Step 1: Copy current version to archive
			if (currentVersion !== NOT_PUBLISHED) {
				await archiveCurrentVersion(timestamp, hasDataset);
			}

			// Step 2: Upload new version to user root (replaces current)
			await fbSdk.createFile(`${path}/${fileName}`);  //won't overwrite if exist
			await fbSdk.setFileContent(`${path}/${fileName}`, data);

			//Update current version
			const currVersion = await getCurrentVersion(fbSdk, aidonSdk);
			if (currVersion) {
				setCurrentVersion(currVersion);
			}

			if (hasDataset) {
				await fbSdk.createFile(`${path}/${dataFileName}`);  //won't overwrite if exist
				await fbSdk.setFileContent(`${path}/${dataFileName}`, datasetData!);
			}

			// Step 3: Cleanup old versions (keep max 10)
			await cleanupOldVersions(hasDataset);

			// Step 4: Create model in Aidon if not already there
			await createModelInAidon()
		}
	};

	const getCurrentVersion = async(fbsdk:FileBrowserSDK, aidonsdk:AidonSDK): Promise<string | undefined> => {
		if (fbsdk && projState.path) {
			if (!await fbsdk.ensureValidToken()) {
				await authenticateApiSdks(fbsdk, aidonsdk);
			}

			const { path, fileName } = getContextInfo(fbsdk);

			try {
				const file = await fbsdk.getFileDetails(`${path}/${fileName}`);
				if (file) {
					return formatRevisionDate(file.modified);
				}
			} catch (err) {
				console.error("Error getting file:", err);
			}
		}
		return undefined;
	};

	async function getVersionHistory(): Promise<VersionHistoryItem[]> {
		if (!fbSdk || !aidonSdk || !projState.loaded || !projState.path) {
			return [];
		}

		if (!await fbSdk.ensureValidToken()) {
			await authenticateApiSdks(fbSdk, aidonSdk);
		}

		const { path, fileName } = getContextInfo();
		const allVersions = await fbSdk.getFilesInFolder(`${path}/versions`);
		const versions = groupVersionsByTimestamp(allVersions.items, fileName);

		return versions.slice(0, 10).map((v, index) => ({
			version: versions.length - index,
			revisedAt: v.timestamp,
			projectFile: v.projectFile,
			dataFile: v.dataFile,
		}));
	}

	const downloadVersion = async(
		version: VersionHistoryItem,
		projectFile: boolean
	) => {
		if (!fbSdk || !aidonSdk || !projState.loaded || !projState.path) {
			return;
		}

		if (!await fbSdk.ensureValidToken()) {
			await authenticateApiSdks(fbSdk, aidonSdk);
		}
    try {
			const { path } = getContextInfo();
			const fileName = projectFile ? version.projectFile!.name : version.dataFile!.name
			const versionPath = `${path}/versions`
			const { blob } = await fbSdk.downloadFile(versionPath, fileName)

      // Trigger browser download
      const url = window.URL.createObjectURL(blob); //NOSONAR
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      document.body.removeChild(a); //NOSONAR
      window.URL.revokeObjectURL(url); //NOSONAR

      // Optional: Show success message
      // toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      console.error('Download failed:', error);
			const errorMessage = (error instanceof Error) ? error.message : 'Unknown error'
      toast.error('Download failed: ' + errorMessage);
    } finally {
      // setIsDownloading(false);
    }
	}

  return {
    archiveCurrentVersion,
		cleanupOldVersions,
		formatRevisionDate,
		getCurrentVersion,
		getVersionHistory,
    groupVersionsByTimestamp,
		publishProject,
		downloadVersion,
		currentVersion,
		hasFBContext
  };
}