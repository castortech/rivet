import { useEffect, useState, type FC } from 'react';
import Button from '@atlaskit/button';
import { CONFIGURED, NOT_PUBLISHED, useProjectRevisions, type VersionHistoryItem } from '../hooks/useFileRevisions';
import { ProjectVersionsModal } from './SharedProjectModal';

export const ProjectRevisionsFB: FC = () => {
	const {
		currentVersion,
		formatRevisionDate,
		fbConfig,
		publishProject,
		getVersionHistory,
		downloadVersion
	} = useProjectRevisions();

  return (
		<>
			<div>{currentVersion}</div>
			{currentVersion !== NOT_PUBLISHED &&
				<div className="context-list-actions">
					<ShowVersionsButton
						currentVersion={currentVersion}
						getVersionHistory={getVersionHistory}
						downloadVersion={downloadVersion}
						formatRevisionDate={formatRevisionDate}
					/>
				</div>
			}

			{fbConfig === CONFIGURED ? (
				<div className="context-list-actions">
					<Button appearance="default" onClick={() => void publishProject()}>
						Publish
					</Button>
				</div>
			) : (
				<div>{fbConfig}</div>
			)}
		</>
  );
};

type ShowVersionsButtonProps = {
	currentVersion: string
	getVersionHistory: () => Promise<VersionHistoryItem[]>
	downloadVersion: (version: VersionHistoryItem, projectFile: boolean) => Promise<void>
	formatRevisionDate: (value?: string | number | Date) => string
}

const ShowVersionsButton: FC<ShowVersionsButtonProps> = ({
	currentVersion,
	getVersionHistory,
	downloadVersion,
	formatRevisionDate

}) => {
	const [modalOpen, setModalOpen] = useState(false)
	const [versions, setVersions] = useState<VersionHistoryItem[]>([])

	useEffect(() => {
		const init = async () => {
			try {
				const versionHistory = await getVersionHistory();
				setVersions(versionHistory)
			} catch (error) {
				console.error(`Error authenticating with FileBrowser`);
			}
		};
		init();
	}, [currentVersion])

	return (
		<>
			<Button onClick={() => setModalOpen(true)}>Show Versions</Button>
			<ProjectVersionsModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				versions={versions}
				onDownload={(version, project) => void downloadVersion(version, project)}
				formatRevisionDate = {formatRevisionDate}
			/>
			{/* Use a modal for details if needed */}
		</>
	)
}
