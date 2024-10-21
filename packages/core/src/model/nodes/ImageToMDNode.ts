import {
  type ChartNode,
  type NodeId,
  type NodeInputDefinition,
  type PortId,
  type NodeOutputDefinition,
	type EditorDefinition,
	type DataRef,
	type InternalProcessContext,
	uint8ArrayToBase64
} from '../../index.js';
import { nanoid } from 'nanoid/non-secure';
import { NodeImpl, type NodeUIData } from '../NodeImpl.js';
import { nodeDefinition } from '../NodeDefinition.js';
import { type Inputs, type Outputs } from '../GraphProcessor.js';
import { dedent } from 'ts-dedent';
import { expectType } from '../../utils/expectType.js';

export type ImageToMDNode = ChartNode<'imagetoMD', ImageToMDNodeData>;

export type ImageToMDNodeData = {
  data?: DataRef;
  useDataInput: boolean;
  mediaType: 'image/png' | 'image/jpeg' | 'image/gif';
  useMediaTypeInput: boolean;
};

export class ImageToMDNodeImpl extends NodeImpl<ImageToMDNode> {
  static create(): ImageToMDNode {
    const chartNode: ImageToMDNode = {
      type: 'imagetoMD',
      title: 'Image To Markdown',
      id: nanoid() as NodeId,
      visualData: {
        x: 0,
        y: 0,
        width: 175,
      },
      data: {
        useDataInput: false,
        mediaType: 'image/png',
        useMediaTypeInput: false,
      },
    };

    return chartNode;
  }

  getInputDefinitions(): NodeInputDefinition[] {
    const inputDefinitions: NodeInputDefinition[] = [];

    if (this.chartNode.data.useDataInput) {
      inputDefinitions.push({
        id: 'data' as PortId,
        title: 'Data',
        dataType: 'image',
        coerced: false,
      });
    }

    if (this.chartNode.data.useMediaTypeInput) {
      inputDefinitions.push({
        id: 'mediaType' as PortId,
        title: 'Media Type',
        dataType: 'string',
      });
    }

    return inputDefinitions;
  }

  getOutputDefinitions(): NodeOutputDefinition[] {
    return [
      {
        id: 'imageMarkdown' as PortId,
        title: 'Image',
        dataType: 'string',
      },
    ];
  }

  getEditors(): EditorDefinition<ImageToMDNode>[] {
    return [
      {
        type: 'dropdown',
        label: 'Media Type',
        dataKey: 'mediaType',
        options: [
          { value: 'image/png', label: 'PNG' },
          { value: 'image/jpeg', label: 'JPEG' },
          { value: 'image/gif', label: 'GIF' },
        ],
        useInputToggleDataKey: 'useMediaTypeInput',
      },
      {
        type: 'imageBrowser',
        label: 'Image',
        dataKey: 'data',
        useInputToggleDataKey: 'useDataInput',
        mediaTypeDataKey: 'mediaType',
      },
    ];
  }

  getBody(): string | undefined {
    return this.data.mediaType;
  }

  static getUIData(): NodeUIData {
    return {
      infoBoxBody: dedent`
        Turns the input value (image byte array) into its Markdown equivalent.
      `,
      infoBoxTitle: 'Image to Markdown Node',
      contextMenuTitle: 'Image to Markdown',
      group: ['Data'],
    };
  }

  async process(inputData: Inputs, context: InternalProcessContext): Promise<Outputs> {
  	let data: string

    if (this.chartNode.data.useDataInput) {
      const imageData = expectType(inputData['data' as PortId], 'image');
			data = (await uint8ArrayToBase64(imageData.data))!;
    } else {
      const dataRef = this.data.data?.refId;
      if (!dataRef) {
        throw new Error('No data ref');
      }

      const encodedData = context.project.data?.[dataRef] as string;

      if (!encodedData) {
        throw new Error(`No data at ref ${dataRef}`);
      }

      data = encodedData;
    }

		data = `![Image](data:image/png;base64,${data})`

    return {
      ['imageMarkdown' as PortId]: {
        type: 'string',
        value: data,
      },
    };
  }
}

export const imageToMDNode = nodeDefinition(ImageToMDNodeImpl, 'Image To Markdown');
