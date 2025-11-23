import { type FC, useEffect, useState } from 'react';
import { atom, useAtom } from 'jotai';
import { useProjectRevisions, type VersionHistoryItem } from '../hooks/useFileRevisions';
import { ProjectVersionsModal } from './SharedProjectModal';

interface DownloadSharedModalProps {}

export const downloadSharedModalOpenState = atom(false);

export const DownloadSharedModal: FC<DownloadSharedModalProps> = () => {
	const [modalOpen, setModalOpen] = useAtom(downloadSharedModalOpenState);
	const [sharedProjects, setSharedProjects] = useState<VersionHistoryItem[]>([])

	const {
		formatRevisionDate,
		getSharedProjects,
		downloadVersion
	} = useProjectRevisions();

	useEffect(() => {
		const init = async () => {
			try {
				const sharedProjects = await getSharedProjects();
				setSharedProjects(sharedProjects)
			} catch (error) {
				console.error(`Error authenticating with FileBrowser`);
			}
		};
		init();
	}, [])

	return (
		<ProjectVersionsModal
			open={modalOpen}
			onClose={() => setModalOpen(false)}
			versions={sharedProjects}
			onDownload={(version, project) => void downloadVersion(version, project)}
			formatRevisionDate = {formatRevisionDate}
		/>
	)
}
