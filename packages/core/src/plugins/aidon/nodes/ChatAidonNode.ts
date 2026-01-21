import {
  type ChartNode,
  type EditorDefinition,
  type Inputs,
  type InternalProcessContext,
  type NodeInputDefinition,
  type NodeOutputDefinition,
  type NodeUIData,
  type Outputs,
  type PluginNodeImpl,
  type PortId,
	ChatNodeImpl,
	type ChatNode,
	type ChatNodeData,
	type ChatMessage,
	type GptFunction,
	globalRivetNodeRegistry,
	type DataValue,
	type MCP,
	MCPError,
	MCPErrorType,
	type ParsedAssistantChatMessageFunctionCall,
	type GraphId,
} from '../../../index.js';

import {  getError } from '../../../utils/errors.js';

import { omit } from 'lodash-es';
import { dedent } from 'ts-dedent';
import { coerceTypeOptional } from '../../../utils/coerceType.js';
import { pluginNodeDefinition } from '../../../model/NodeDefinition.js';
import { loadMCPConfiguration } from '../../../integrations/mcp/MCPUtils.js';

// Temporary
// const cache = new Map<string, Outputs>();

const registry = globalRivetNodeRegistry;

export type ChatAidonNode = ChartNode<'chatAidon', ChatNodeData>;

//comes from Chatbot
interface SchemaDetail {
	// toolId: string
  title: string
  description: string
  url: string
  headers: string
  routeMap: Record<string, string>
  requestInBody: boolean
}

// interface FunctionCall {
//   name: string
//   arguments: string
// 	id: string
// };

class ChatAidonNodeImpl extends ChatNodeImpl {
	create(): ChatAidonNode {
		const chatNode: ChatAidonNode = {
			...this.chartNode,
			type: 'chatAidon',
			title: 'Chat (Aidon)',
		};
		return chatNode;
	}

	// removeInvalidInputs(inputs: Inputs): Inputs {
	// 	if (!inputs['toolSchemas' as PortId]) {
	// 		const { ['functions' as PortId]: _, ...rest } = inputs;
	// 		return rest;
	// 	}
	// 	return inputs;
	// }

	convertToolSchemaToSchemaDetail(toolSchema: GptFunction): SchemaDetail {
		const { name, description, parameters } = toolSchema;
		// Assuming the structure of parameters from the example
		const { headers, requestInBody, routeMap, url } = parameters as {
			headers: string
			requestInBody: boolean
			routeMap: Record<string, string>
			url: string
		};

		return {
			title: name,
			description,
			url,
			headers,
			routeMap,
			requestInBody
		};
	}

	extractPath(schemaDetail: SchemaDetail, functionName: string, parsedArgs: any) {
		const pathTemplate = Object.keys(schemaDetail.routeMap).find(
			key => schemaDetail.routeMap[key] === functionName
		);

		if (!pathTemplate) {
			throw new Error(`Path for function ${functionName} not found`);
		}

		const path = pathTemplate.replace(/:(\w+)/g, (_, paramName) => {
			const value = parsedArgs.parameters[paramName];
			if (!value) {
				throw new Error(
					`Parameter ${paramName} not found for function ${functionName}`
				);
			}
			return encodeURIComponent(value);
		});

		if (!path) {
			throw new Error(`Path for function ${functionName} not found`);
		}
		return path;
	}

	async callToolGet(schemaDetail: SchemaDetail, path: string, parsedArgs: any, data: {}) {
		const queryParams = new URLSearchParams(
			parsedArgs.parameters
		).toString();
		const fullUrl = schemaDetail.url + path + (queryParams ? "?" + queryParams : "");
		let headers = {};

		// Check if custom headers are set
		const customHeaders = schemaDetail.headers;
		if (customHeaders && typeof customHeaders === "string") {
			headers = JSON.parse(customHeaders);
		}

		const response = await fetch(fullUrl, {
			method: "GET",
			headers: headers
		});

		if (!response.ok) {
			data = {
				error: response.statusText
			};
		} else {
			data = await response.json();
		}
		return data;
	}

	async callToolPost(schemaDetail: SchemaDetail, path: string, parsedArgs: any, data: {}) {
		let headers = {
			"Content-Type": "application/json"
		};

		// Check if custom headers are set
		const customHeaders = schemaDetail.headers; // Moved this line up to the loop

		// Check if custom headers are set and are of type string
		if (customHeaders && typeof customHeaders === "string") {
			const parsedCustomHeaders = JSON.parse(customHeaders) as Record<string, string>;

			headers = {
				...headers,
				...parsedCustomHeaders
			};
		}

		const fullUrl = schemaDetail.url + path;
		const bodyContent = parsedArgs.requestBody ?? parsedArgs;

		const requestInit = {
			method: "POST",
			headers,
			body: JSON.stringify(bodyContent) // Use the extracted requestBody or the entire parsedArgs
		};

		const response = await fetch(fullUrl, requestInit);

		if (!response.ok) {
			data = {
				error: response.statusText
			};
		} else {
			data = await response.json();
		}
		return data;
	}

	async callOpenApiTool(inputs: Inputs, functionCall: ParsedAssistantChatMessageFunctionCall, data: {}) {
		const toolSchemas = coerceTypeOptional(inputs['toolSchemas' as PortId], 'gpt-function[]')
		// Find the schema detail that contains the function name
		const toolSchema = toolSchemas!.find(detail => detail.name === functionCall.name);
		if (!toolSchema) {
			throw new Error(`Function ${functionCall.name} not found in any schema`);
		}
		const schemaDetail = this.convertToolSchemaToSchemaDetail(toolSchema);
		const path = this.extractPath(schemaDetail, functionCall.name, functionCall.arguments);

		// Determine if the request should be in the body or as a query
		if (schemaDetail.requestInBody) { // If the type is set to body
			data = await this.callToolPost(schemaDetail, path, functionCall.arguments, data);
		} else { // If the type is set to query
			data = await this.callToolGet(schemaDetail, path, functionCall.arguments, data);
		}

		return data;
	}

	async callMcpTool(context: InternalProcessContext, functionCall: ParsedAssistantChatMessageFunctionCall, funct: GptFunction, data: {}) {
		if (funct.config === undefined) {
			throw new Error(`MCP function ${functionCall.name} is missing MCP configuration`);
		}
		const mcpConfig = funct.config as MCP.MCPConfig;

		const name = mcpConfig.name;
		const version = mcpConfig.version;
		const transportType = mcpConfig.transportType;
		// const toolCallId = getInputOrData(this.data, inputs, 'toolCallId', 'string');

		const toolCall: MCP.ToolCallRequest = {
			name: functionCall.name,
			arguments: functionCall.arguments,
		};

		let toolResponse: MCP.ToolCallResponse | undefined = undefined;

		try {
			if (!context.mcpProvider) {
				throw new Error('MCP Provider not found');
			}

			if (transportType === 'http') {
				const serverUrl = mcpConfig.serverUrl;
				if (!serverUrl || serverUrl === '') {
					throw new MCPError(MCPErrorType.SERVER_NOT_FOUND, 'No server URL was provided');
				}
				if (!serverUrl.includes('/mcp')) {
					throw new MCPError(
						MCPErrorType.SERVER_COMMUNICATION_FAILED,
						'Include /mcp in your server URL. For example: http://localhost:8080/mcp',
					);
				}

				const headers = mcpConfig.headers;
				toolResponse = await context.mcpProvider.httpToolCall({ name, version }, serverUrl, headers, toolCall);
			} else if (transportType === 'stdio') {
				const serverId = mcpConfig.serverId ?? '';

				const mcpConfiguration = await loadMCPConfiguration(context);
				if (!mcpConfiguration.mcpServers[serverId]) {
					throw new MCPError(MCPErrorType.SERVER_NOT_FOUND, `Server ${serverId} not found in MCP config`);
				}

				const serverConfig = {
					config: mcpConfiguration.mcpServers[serverId],
					serverId,
				};

				toolResponse = await context.mcpProvider.stdioToolCall({ name, version }, serverConfig, toolCall);
			}
		} catch (err) {
			const { message } = getError(err);
			if (context.executor === 'browser') {
				throw new Error('Failed to create Client without a node executor');
			}
			console.log(message);
			throw err;
		}
		if (toolResponse) {
			return toolResponse;
		} else {
			return data;
		}
	}

	async callInternalTool(context: InternalProcessContext, functionCall: ParsedAssistantChatMessageFunctionCall, data: {}) {
		let handler: { key: string; value: GraphId } | undefined;

		const matchingGraph = Object.values(context.project.graphs).find((graph) =>
			graph.metadata?.name?.includes('Tools/' + functionCall.name),
		);

		if (matchingGraph) {
			handler = { key: undefined!, value: matchingGraph.metadata!.id! };
		}

		if (!handler) {
			throw new Error(`No handler found for tool call: ${functionCall.name}`);
		}

		const subgraphInputs: Record<string, DataValue> = {
			_function_name: {
				type: 'string',
				value: functionCall.name,
			},
			_arguments: {
				type: 'object',
				value: functionCall.arguments,
			},
		};

		for (const [argName, argument] of Object.entries(functionCall.arguments ?? {})) {
			subgraphInputs[argName] = {
				type: 'any',
				value: argument,
			};
		}

		const handlerGraphId = handler.value;
		const subprocessor = context.createSubProcessor(handlerGraphId, { signal: context.signal });
		data = await subprocessor.processGraph(context, subgraphInputs, context.contextValues);

		return data;
	}

	// Override the process function
  async process(inputs: Inputs, context: InternalProcessContext): Promise<Outputs> {
		// //make sure not to include functions if we have no way to run them after.
		// inputs = this.removeInvalidInputs(inputs);

		// const configData = this.data
		// configData.frequencyPenalty = 2;

		// Call the parent class's process method to do its job
		let outputs = await super.process(inputs, context);
	  let messages = outputs['all-messages' as PortId]

	  let iterations = 0
	  const maxIterations = 20  //20 is Vercel AI maxSteps default, so using same value. Configurable? E.g., via inputs['maxToolIterations' as PortId]?.value as number ?? 20

	  while (true) {
			if (iterations >= maxIterations) {
				// Optionally append an error message to outputs or throw
				throw new Error(`Max tool call iterations (${maxIterations}) exceeded`)
			}

			//Now check if the LLM wants us to do some tool calling
			const funcCallOutput = outputs['function-call' as PortId] ?? outputs['function-calls' as PortId];
	    const funcCalls = funcCallOutput?.type === 'object[]'
	         ? funcCallOutput.value
	         : undefined;  // coerceTypeOptional(functionCallOutput, 'string[]');

	    if (!funcCalls) break  // Exit if no (more) tool calls

			console.log(`Need to call ${funcCalls.length} tools this iteration...`);
  		iterations++
	  	const functions = coerceTypeOptional(inputs['functions' as PortId], 'gpt-function[]')

			const functionCalls: Array<ParsedAssistantChatMessageFunctionCall> = funcCalls.map((functionCall) => ({
				name: functionCall.name as string,
				arguments: functionCall.arguments as Record<string, unknown>,
				id: functionCall.id as string,
			}));

			//call the tool(s) to get the results to add to the message
			for (const functionCall of functionCalls) {
				const funct = functions!.find(fctn => fctn.name === functionCall.name);
				if (!funct) {
          throw new Error(`Function ${functionCall.name} not found in functions input`);
        }

        let data = {};
				console.log(`Calling tool ${functionCall.name} in namespace ${funct.namespace}...`);

				switch (funct.namespace) {
					case 'openapi':
						data = await this.callOpenApiTool(inputs, functionCall, data);
						break;
					case 'mcp':
						data = await this.callMcpTool(context, functionCall, funct, data);
						break;
					case 'internal':
					default:  //try to call as internal if no namespace specified
						data = await this.callInternalTool(context, functionCall, data);
						break;
				}
				console.log(`Tool call result for	${functionCall.name} is ${JSON.stringify(data)}...`);

				(messages!['value'] as ChatMessage[]).push({
					type: "function",
          name: functionCall.id ?? functionCall.name,
          message: JSON.stringify(data)
        });
      }

			inputs = omit(inputs, ['prompt']);
			inputs['prompt' as PortId] = messages as unknown as DataValue;
			outputs = await super.process(inputs, context);
			messages = outputs['all-messages' as PortId];  // Update for next iteration
		}

		return outputs;
	}
}

const createPluginNodeImpl = (chatNode: ChartNode): PluginNodeImpl<ChatAidonNode> => {
	const impl = new ChatAidonNodeImpl(chatNode as ChatNode);

	return {
		create(): ChatAidonNode {
			return impl.create();
		},
		getInputDefinitions(data): NodeInputDefinition[] {
			impl.chartNode.data = data;  // Ensure data is set correctly in the base class
			const inputs = impl.getInputDefinitions();
			if (data.enableFunctionUse) {
				inputs.push({
					dataType: ['gpt-function', 'gpt-function[]'] as const,
					id: 'toolSchemas' as PortId,
					title: 'Tool Schemas',
					description: 'The schemas required to run the tool(s) specified in the functions input keyed by function name.',
					coerced: true,
				});
			}
			return inputs;
		},
		getOutputDefinitions(data): NodeOutputDefinition[] {
			impl.chartNode.data = data;  // Ensure data is set correctly in the base class
			const outputs: NodeOutputDefinition[] = impl.getOutputDefinitions();
			return outputs.filter(output => {
				return output.id !== 'function-calls';
			});
		},
		getEditors(data: ChatNodeData): EditorDefinition<ChatNode>[] {
			impl.chartNode.data = data;  // Ensure data is set correctly in the base class
			return impl.getEditors();
		},
		getBody(data): string | undefined {
			impl.chartNode.data = data;  // Ensure data is set correctly in the base class
			return impl.getBody();
		},
		getUIData(): NodeUIData {
			return {
				infoBoxBody: dedent`
					Makes a call to an Aidon chat model. The settings contains many options for tweaking the model's behavior.
				`,
				infoBoxTitle: 'Chat (Aidon) Node',
				contextMenuTitle: 'Chat (Aidon)',
				group: ['AI'],
			};
		},
		async process(
			data: ChatNodeData,
			inputData: Inputs,
			context: InternalProcessContext,
		): Promise<Outputs> {
			impl.chartNode.data = data;  // Ensure data is set correctly in the base class
			return impl.process(inputData, context);
		},
	};
};

export function chatAidonNode() {
	const chatNode:ChartNode = registry.create('chat');
	const chatAidonNodeImpl = createPluginNodeImpl(chatNode);
	return pluginNodeDefinition(chatAidonNodeImpl, 'Chat Aidon Node');
}
