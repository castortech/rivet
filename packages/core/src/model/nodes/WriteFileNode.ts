import {
  type ChartNode,
  type NodeId,
  type PortId,
  type NodeInputDefinition,
  type NodeOutputDefinition,
} from '../NodeBase.js';
import { type DataValue } from '../DataValue.js';
import { NodeImpl, type NodeBody, type NodeUIData } from '../NodeImpl.js';
import { nodeDefinition } from '../NodeDefinition.js';
import { nanoid } from 'nanoid/non-secure';
import { getInputOrData } from '../../utils/index.js';
import { type InternalProcessContext } from '../ProcessContext.js';
import { dedent } from 'ts-dedent';
import type { EditorDefinition } from '../EditorDefinition.js';
import { coerceTypeOptional } from '../../utils/coerceType.js';
import { extractInterpolationVariables, interpolate } from '../../utils/interpolation.js';

export type WriteFileNode = ChartNode<'writeFile', WriteFileNodeData>;

type WriteFileNodeData = {
  path: string;
  usePathOutput: boolean;

  asBinary?: boolean;

  overwriteExistingFile?: boolean;
};

const mimeToExtension: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'audio/wav': 'wav',
  'audio/mpeg	': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg'
};

export class WriteFileNodeImpl extends NodeImpl<WriteFileNode> {
  static create(): WriteFileNode {
    return {
      id: nanoid() as NodeId,
      type: 'writeFile',
      title: 'Write File',
      visualData: { x: 0, y: 0, width: 250 },
      data: {
        path: '',
        asBinary: false,
        usePathOutput: true,
        overwriteExistingFile: false,
      },
    };
  }

  getInputDefinitions(): NodeInputDefinition[] {
    const inputDefinitions: NodeInputDefinition[] = [
      {
        id: 'content' as PortId,
        title: 'Content',
        dataType: this.data.asBinary ? 'binary' : 'string',
      },
		];

    if (this.chartNode.data.usePathOutput) {
      inputDefinitions.push({
        id: 'path' as PortId,
        title: 'Path',
        dataType: 'string',
        coerced: false,
      });
    }

    return inputDefinitions;
  }

  getOutputDefinitions(): NodeOutputDefinition[] {
    return [
      {
        id: 'outputContent' as PortId,
        title: 'Content',
        dataType: this.data.asBinary ? 'binary' : 'string',
      },
    ];
  }

  static getUIData(): NodeUIData {
    return {
      infoBoxBody: dedent`
        Writes the contents of the specified file and outputs it as a string.
      `,
      infoBoxTitle: 'Write File Node',
      contextMenuTitle: 'Write File',
      group: ['Input/Output'],
    };
  }

  getEditors(): EditorDefinition<WriteFileNode>[] {
    return [
      {
        type: 'string',
        label: 'Path',
        dataKey: 'path',
        useInputToggleDataKey: 'usePathOutput',
      },
      {
        type: 'toggle',
        label: 'Overwrite Existing File instead of making additional copy',
        dataKey: 'overwriteExistingFile',
      },
      {
        type: 'toggle',
        label: 'Read as Binary',
        dataKey: 'asBinary',
      },
    ];
  }

  getBody(): NodeBody {
    return dedent`
      ${this.data.asBinary ? 'Write as Binary' : 'Write as Text'}
      ${this.data.usePathOutput ? '' : `Path: ${this.data.path}`}
    `;
  }

  async process(
    inputData: Record<PortId, DataValue>,
    context: InternalProcessContext,
  ): Promise<Record<PortId, DataValue>> {
    const { nativeApi } = context;
		const inputContent = inputData['content' as PortId] ?? { type: 'any', value: undefined };

    if (nativeApi == null) {
      throw new Error('This node requires a native API to run.');
    }

		const currentPath = context.project.metadata?.path;
    if (!currentPath) {
      throw new Error('Project metadata is missing path.');
    }

		const folderPath = currentPath.replace('.rivet-project', '.rivet-files');
		await nativeApi.createdir(folderPath, true);

    let path = getInputOrData(this.chartNode.data, inputData, 'path');
		const interpolations = extractInterpolationVariables(path);

		if (interpolations.includes('ext')) {
			let extension = 'txt';

			if (this.data.asBinary) {
				if (inputContent.type === 'audio') {
					extension = mimeToExtension[inputContent.value.mediaType ?? '']  ?? 'audio';
				} else if (inputContent.type === 'image') {
					extension = mimeToExtension[inputContent.value.mediaType ?? '']  ?? 'image';
				} else {
					extension = 'binary';
				}
			}

			path = interpolate(path, { ext: extension });
		}

		let fileDestination = await nativeApi.join(folderPath, path);

		if (!this.data.overwriteExistingFile) {
			fileDestination = await nativeApi.uniqueFilename(fileDestination);
		}


		if (this.data.asBinary) {
			const content = coerceTypeOptional(inputContent, 'binary') ?? new Uint8Array();
			await nativeApi.writeBinaryFile(fileDestination, content);
			return {
				['outputContent' as PortId]: { type: 'binary', value: content },
			};
		} else {
			const content = coerceTypeOptional(inputContent, 'string') ?? '';
			await nativeApi.writeTextFile(fileDestination, content);
			return {
				['outputContent' as PortId]: { type: 'string', value: content },
			};
		}
  }
}

export const writeFileNode = nodeDefinition(WriteFileNodeImpl, 'Write File');
