import { css } from '@emotion/react'

export const getRevisionStyles = (settings: string | undefined) => css`
		.revisions {
			display: flex;
			flex-direction: column;
			margin-right: -12px;
			margin-left: -12px;
		}

		.revision {
			border-bottom: 1px solid var(--grey);
			padding: 8px;
			padding-left: 12px;

			cursor: pointer;

			&:hover {
				background-color: var(--grey-darkish);
			}
		}

		.hash {
			border-radius: 8px;
			background-color: var(--grey-darkish);
			display: inline-flex;
			padding: 2px 4px;
			font-size: 11px;
		}

		.message {
			font-size: 12px;
		}

		.loading-area {
			padding: 8px;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 8px;
		}

		.loaded-area {
			padding: 8px;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 8px;
		}
	`;

export const getModalBodyStyles = (settings: string | undefined) => css`
  .author {
    span {
      background: var(--grey-darkish);
      padding: 4px 8px;
      border-radius: 8px;
    }
  }

  .date {
    font-size: 12px;
    margin-left: 16px;
    margin-top: 4px;
  }

  .description {
    padding-left: 16px;
    border-left: 4px solid var(--grey-darkest);
  }
`;
