import {
  type NodeId,
  type Inputs,
  type Outputs,
  type GraphOutputs,
  type GraphProcessor,
  type PortId,
	type ArrayDataValue,
	type AnyDataValue,
} from '../index.js';
import { coerceType } from '../utils/coerceType.js';

export type RivetEventStreamFilterSpec = {
  /** Stream partial output deltas for the specified node IDs or node titles. */
  partialOutputs?: string[] | true;

  /** Send the graph output when done? */
  done?: boolean;

  /** If the graph errors, send an error event? */
  error?: boolean;

	/** Expose the cost of the graph run in the response */
  exposeCost?: boolean;

	/** Expose the token usage of the graph run in the response */
  exposeUsage?: boolean;

	/** Whether to remove the final output when done is true */
  removeFinalOutput?: boolean;

  /** Stream node start events for the specified node IDs or node titles. */
  nodeStart?: string[] | true;

  /** Stream node finish events for the specified nodeIDs or node titles. */
  nodeFinish?: string[] | true;
};

/** Map of all possible event names to their data for streaming events. */
export type RivetEventStreamEvent = {
  /** Deltas for partial outputs. */
  partialOutput: {
    nodeId: NodeId;
    nodeTitle: string;
    delta: string;
  };

  nodeStart: {
    nodeId: NodeId;
    nodeTitle: string;
    inputs: Inputs;
  };

  nodeFinish: {
    nodeId: NodeId;
    nodeTitle: string;
    outputs: Outputs;
  };

  done: {
    graphOutput: GraphOutputs;
  };

  error: {
    error: string;
  };
};

export type RivetEventStreamEventInfo = {
  [P in keyof RivetEventStreamEvent]: {
    type: P;
  } & RivetEventStreamEvent[P];
}[keyof RivetEventStreamEvent];

function nodeMatches(spec: any, event: any) {
	return 	spec?.includes(event.node.id) ||
					spec?.includes(event.node.data?.id) ||
					spec?.includes(event.node.title)
}

/** A simplified way to listen and stream processor events, including filtering. */
export async function* getProcessorEvents(
  processor: GraphProcessor,
  spec: RivetEventStreamFilterSpec,
): AsyncGenerator<RivetEventStreamEventInfo, void> {
  const previousIndexes = new Map<NodeId, number>();
	const usages: unknown[] = [];

  for await (const event of processor.events()) {
    if (event.type === 'partialOutput') {
      if (
        spec.partialOutputs === true ||
				nodeMatches(spec.partialOutputs, event)
      ) {
        const currentOutput = coerceType(event.outputs['response' as PortId], 'string');
        const delta = currentOutput.slice(previousIndexes.get(event.node.id) ?? 0);

        yield {
          type: 'partialOutput',
          nodeId: event.node.id,
          nodeTitle: event.node.title,
          delta,
        };

        previousIndexes.set(event.node.id, currentOutput.length);
      }
    } else if (event.type === 'done') {
      if (spec.done) {
				const results = event.results;
				if (!spec.exposeCost) {
					delete results.cost;
				}
				if (!spec.exposeUsage) {
					delete results.requestTokens;
					delete results.responseTokens;
				}
				else if (usages.length) {
					const usageOutput: ArrayDataValue<AnyDataValue> = {
						type: 'any[]',
						value: usages
					}
					results['usages'] = usageOutput;
				}
				if (spec.removeFinalOutput) {
					delete results.output;
				}

        yield {
          type: 'done',
          graphOutput: results,
        };
      }
    } else if (event.type === 'error') {
      if (spec.error) {
        yield {
          type: 'error',
          error: typeof event.error === 'string' ? event.error : event.error.toString(),
        };
      }
    } else if (event.type === 'nodeStart') {
      if (
        spec.nodeStart === true ||
				nodeMatches(spec.nodeStart, event)

      ) {
        yield {
          type: 'nodeStart',
          inputs: event.inputs,
          nodeId: event.node.id,
          nodeTitle: event.node.title,
        };
      }
    } else if (event.type === 'nodeFinish') {
			if (spec.exposeUsage) {
				const usage = event.outputs['usage' as PortId];
				if (usage !== undefined) {
					usages.push(usage);
				}
			}

      if (
        spec.nodeFinish === true ||
				nodeMatches(spec.nodeFinish, event)
      ) {
        yield {
          type: 'nodeFinish',
          outputs: event.outputs,
          nodeId: event.node.id,
          nodeTitle: event.node.title,
        };
      }
    }
  }
}

/**
 * Creates a ReadableStream for processor events, following the Server-Sent Events protocol.
 * https://developer.mozilla.org/en-US/docs/Web/API/EventSource
 *
 * Includes configuration for what events to send to the client, for example you can stream the partial output deltas
 * for specific nodes, and/or the graph output when done.
 */
export function getProcessorSSEStream(
  processor: GraphProcessor,

  /** The spec for what you're streaming to the client */
  spec: RivetEventStreamFilterSpec,
) {
  const encoder = new TextEncoder();

  function sendEvent<T extends keyof RivetEventStreamEvent>(
    controller: ReadableStreamDefaultController,
    type: T,
    data: RivetEventStreamEvent[T],
  ) {
    const event = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(event));
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of getProcessorEvents(processor, spec)) {
          sendEvent(controller, event.type, event);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

export function getSingleNodeStream(processor: GraphProcessor, nodeIdOrTitle: string): ReadableStream<string>
export function getSingleNodeStream(processor: GraphProcessor, spec: RivetEventStreamFilterSpec): ReadableStream<string>

export function getSingleNodeStream(processor: GraphProcessor, arg: RivetEventStreamFilterSpec | string) {
	let spec;
	if (typeof arg === 'string') {
		const nodeIdOrTitle = arg;
		spec = {
			partialOutputs: [nodeIdOrTitle],
			nodeFinish: [nodeIdOrTitle],
		};
	}
	else {
		spec = arg;
	}

  return new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const event of getProcessorEvents(processor, spec)) {
          if (event.type === 'partialOutput') {  //nodeIdOrTitle filter managed by spec
            controller.enqueue(`data: ${JSON.stringify(event.delta)}\n\n`);
          }
					else if (event.type === 'nodeFinish') {
						const value = (event.outputs as Record<string, any>)['valueOutput']?.value
            controller.enqueue(`data: ${JSON.stringify(value)}\n\n`);
					}
					else if (event.type === 'error') {
						controller.enqueue(`error: ${JSON.stringify(event.error)}\n\n`);
					}
					else if (event.type === 'done') {
						if (spec.done) {
							const results = event.graphOutput;
							if (!spec.exposeCost) {
								delete results.cost;
							}
							if (!spec.exposeUsage) {
								delete results.requestTokens;
								delete results.responseTokens;
								delete results.usages;
							}
							if (spec.removeFinalOutput) {
								delete results.output;
							}

							controller.enqueue(`graphOutput: ${JSON.stringify(results)}\n\n`);
						}
            controller.close();
					}
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
