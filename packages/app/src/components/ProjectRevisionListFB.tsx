import { useEffect, useState, type FC } from 'react';
import { useAtomValue } from 'jotai';
import Button from '@atlaskit/button';
import { useProjectRevisions, type VersionHistoryItem } from '../hooks/useFileRevisions';
import { themeState } from '../state/settings';
import Modal, { ModalTransition, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@atlaskit/modal-dialog';
import { css } from '@emotion/react';
import clsx from 'clsx';
import { filesize } from '../utils/file';

export const ProjectRevisionsFB: FC = () => {
	const NOT_PUBLISHED = 'Not published';
	const {
		currentVersion,
		formatRevisionDate,
		hasFBContext,
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

			{hasFBContext ? (
				<div className="context-list-actions">
					<Button appearance="default" onClick={() => void publishProject()}>
						Publish
					</Button>
				</div>
			) : (
				<div>Plugin not configured</div>
			)}
		</>
  );
};

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

type ProjectVersionsModalProps = {
  open: boolean
  onClose: () => void
  versions: VersionHistoryItem[]
  onDownload: (version: VersionHistoryItem, data: boolean) => void
  formatRevisionDate: (value?: string | number | Date) => string
}

const ProjectVersionsModal: FC<ProjectVersionsModalProps> = ({
	open,
	onClose,
	versions,
	onDownload,
	formatRevisionDate
}) => {
  const theme = useAtomValue(themeState)

  if (!open) return null

  return (
    <ModalTransition>
      <Modal onClose={onClose}>
        <ModalHeader>
          <ModalTitle>Previous Project Versions</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className={clsx('app', theme ? `theme-${theme}` : 'theme-default')} css={modalBodyStyles}>
            <table className="versions-table">
              <thead>
                <tr>
                  <th className="versions-th">Name</th>
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
                    <td className="versions-td">
                      {formatRevisionDate(version.revisedAt)}
                    </td>
                    <td className="versions-td">
                      {version.projectFile ? filesize(version.projectFile.size) : '—'}
                    </td>
                    <td className="versions-td">
                      {version.projectFile &&
                        <button
                          className="download-btn"
                          onClick={() => onDownload(version, true)}
                    >
                          Download
                        </button>
                      }
                    </td>
                    <td className="versions-td">
                      {version.dataFile &&
                      <button
                        className="download-btn"
                          onClick={() => onDownload(version, false)}
                      >
                        Download
                      </button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button appearance="primary" onClick={onClose}>Close</Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  )
}

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
