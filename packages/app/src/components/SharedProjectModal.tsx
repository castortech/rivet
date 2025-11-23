import { type FC } from 'react';
import { useAtomValue } from 'jotai';
import Button from '@atlaskit/button';
import { css } from '@emotion/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { themeState } from '../state/settings';
import Modal, { ModalTransition, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@atlaskit/modal-dialog';
import { type VersionHistoryItem } from '../hooks/useFileRevisions';
import { filesize } from '../utils/file';

const modalBodyStyles = css`
	.versions-table {
		width: 100%;
		border-collapse: collapse;
	}
	.versions-th, .versions-td {
		text-align: left;
		padding: 8px 8px;
		font-size: 0.85rem;
	}
	.versions-th {
		color: #b0b3b8;
		font-weight: 600;
		background: transparent;
		border-bottom: 2px solid var(--grey-darkest);
	}
	.versions-tr:not(:last-child) {
		border-bottom: 1px solid var(--grey-darkest);
	}
	.download-btn {
		background: #338af3;
		border: none;
		color: white;
		border-radius: 5px;
		font-size: 0.95rem;
		padding: 7px 13px;
		cursor: pointer;
		transition: background 0.16s;
	}
	.download-btn:hover {
		background: #236fd6;
	}
`;

dayjs.extend(relativeTime)

export type ProjectVersionsModalProps = {
	open: boolean
	onClose: () => void
	versions: VersionHistoryItem[]
	onDownload: (version: VersionHistoryItem, data: boolean) => void
	formatRevisionDate: (value?: string | number | Date) => string
}

export const ProjectVersionsModal: FC<ProjectVersionsModalProps> = ({
	open,
	onClose,
	versions,
	onDownload,
	formatRevisionDate
}) => {
	if (!open) return null

	return (
		<ModalTransition>
			<Modal onClose={onClose}>
				<ModalHeader>
					<ModalTitle>Previous Project Versions</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<VersionsTableBody
						mode={'version'}
						versions={versions}
						onDownload={onDownload}
						formatRevisionDate={formatRevisionDate}
					/>
				</ModalBody>
				<ModalFooter>
					<Button appearance="primary" onClick={onClose}>Close</Button>
				</ModalFooter>
			</Modal>
		</ModalTransition>
	)
}

type VersionsTableBodyProps = {
	mode: 'shared' | 'version'
  versions: VersionHistoryItem[]
	onDownload: (version: VersionHistoryItem, data: boolean) => void
	formatRevisionDate: (value?: string | number | Date) => string
}

export const VersionsTableBody = ({
	mode,
  versions,
  onDownload,
	formatRevisionDate
}: VersionsTableBodyProps) => {
 	const theme = useAtomValue(themeState)

	return (
	<div
			className={clsx(
				'max-h-[60vh] overflow-y-auto',
				'app',
				theme ? `theme-${theme}` : 'theme-default'
			)}
			css={modalBodyStyles}
		>
			<table className="versions-table">
				<thead>
					<tr>
						<th className="versions-th">Name</th>
						{mode === 'shared' && <th className="versions-th">Last modified</th>}
						<th className="versions-th">Size</th>
						<th className="versions-th">Project</th>
						<th className="versions-th">Data</th>
					</tr>
				</thead>
				<tbody>
					{versions.length === 0 && (
						<tr>
							<td className="versions-td" colSpan={4}>No versions found</td>
						</tr>
					)}
					{versions.map((version) => (
						<tr className="versions-tr" key={version.version}>
							{mode === 'version' ? (
								<td className="versions-td">
									{formatRevisionDate(version.revisedAt)}
								</td>
							) : (
								<td className="versions-td">
									{version.baseName}
								</td>
							)}

							{mode === 'shared' && (
								<td className="versions-td">
									{dayjs(version.revisedAt).fromNow()}
								</td>
							)}

							<td className="versions-td">
								{version.projectFile ? filesize(version.projectFile.size) : '—'}
							</td>
							<td className="versions-td">
								{version.projectFile && (
									<button
										className="download-btn"
										onClick={() => onDownload(version, true)}
									>
										Download
									</button>
								)}
							</td>
							<td className="versions-td">
								{version.dataFile && (
									<button
										className="download-btn"
										onClick={() => onDownload(version, false)}
									>
										Download
									</button>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}