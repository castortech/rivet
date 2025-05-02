import { type FC } from 'react';
import Toggle from '@atlaskit/toggle';
import { css } from '@emotion/react';
import Button from '@atlaskit/button';
import { type ChartNode, type WriteFileNode } from '@ironclad/rivet-core';
import { type NodeComponentDescriptor } from '../../hooks/useNodeTypes.js';
import { ioProvider } from '../../utils/globals.js';
import { syncWrapper } from '../../utils/syncWrapper';

type WriteFileNodeBodyProps = {
  node: WriteFileNode;
};

const currentPathCss = css`
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Roboto mono', monospace;
  color: var(--primary-text);
`;

export const WriteFileNodeBody: FC<WriteFileNodeBodyProps> = ({ node }) => {
  return (
    <div>
      {!node.data.usePathOutput && (
        <>
          Path:
          <span css={currentPathCss}>{node.data.path}</span>
        </>
      )}
    </div>
  );
};

export type WriteFileNodeEditorProps = {
  node: WriteFileNode;
  onChange?: (node: ChartNode<'writeFile', WriteFileNode['data']>) => void;
};

const container = css`
  font-family: 'Roboto', sans-serif;
  color: var(--foreground);
  background-color: var(--grey-darker);

  display: grid;
  grid-template-columns: auto 1fr auto;
  row-gap: 16px;
  column-gap: 32px;
  align-items: center;
  grid-auto-rows: 40px;

  .row {
    display: contents;
  }

  .label {
    font-weight: 500;
    color: var(--foreground);
  }

  .input {
    padding: 6px 12px;
    background-color: var(--grey-darkish);
    border: 1px solid var(--grey);
    border-radius: 4px;
    color: var(--foreground);
    outline: none;
    transition: border-color 0.3s;

    &:hover {
      border-color: var(--primary);
    }
  }

  .checkbox-input {
    margin-left: 8px;
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
  }
`;

export const WriteFileNodeEditor: FC<WriteFileNodeEditorProps> = ({ node, onChange }) => {
  const handleBrowseClick = async () => {
    const path = await ioProvider.openFilePath();
    if (path) {
      onChange?.({
        ...node,
        data: { ...node.data, path: path },
      });
    }
  };

  return (
    <div css={container}>
      <div className="row">
        {node.data.usePathOutput ? (
          <></>
        ) : (
          <>
            <label className="label" htmlFor="baseDirectory">
              Pick File
            </label>
            <Button onClick={syncWrapper(handleBrowseClick)}>Browse...</Button>
          </>
        )}
        <Toggle
          id="usePathOutput"
          isChecked={node.data.usePathOutput}
          onChange={(e) =>
            onChange?.({
              ...node,
              data: { ...node.data, usePathOutput: e.target.checked },
            })
          }
        />
      </div>
      <div className="row">
        <div>
          Current Path: <span css={currentPathCss}>{node.data.usePathOutput ? '(Using Output)' : node.data.path}</span>
        </div>
      </div>
    </div>
  );
};

export const writeFileNodeDescriptor: NodeComponentDescriptor<'writeFile'> = {
  Body: WriteFileNodeBody,
  Output: undefined,
  Editor: WriteFileNodeEditor,
};
