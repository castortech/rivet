import { ChartNode, NodeInputDefinition, NodeOutputDefinition } from './NodeBase';

export abstract class NodeImpl<T extends ChartNode<string, unknown>, Type extends T['type'] = T['type']> {
  readonly chartNode: T;

  constructor(chartNode: T) {
    this.chartNode = chartNode;
  }

  get id(): string {
    return this.chartNode.id;
  }

  get type(): Type {
    return this.chartNode.type as Type;
  }

  get title(): string {
    return this.chartNode.title;
  }

  get visualData(): { x: number; y: number } {
    return this.chartNode.visualData;
  }

  get data(): T['data'] {
    return this.chartNode.data;
  }

  get inputDefinitions(): NodeInputDefinition[] {
    return this.chartNode.inputDefinitions;
  }

  get outputDefinitions(): NodeOutputDefinition[] {
    return this.chartNode.outputDefinitions;
  }

  abstract process(inputData: Record<string, any>): Record<string, any>;
}