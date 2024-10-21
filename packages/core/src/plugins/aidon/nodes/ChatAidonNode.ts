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
	Rivet,
	globalRivetNodeRegistry,
	type DataValue,
} from '../../../index.js';

import { omit } from 'lodash-es';
import { dedent } from 'ts-dedent';
import { coerceTypeOptional } from '../../../utils/coerceType.js';
import { pluginNodeDefinition } from '../../../model/NodeDefinition.js';

// Temporary
const cache = new Map<string, Outputs>();

const registry = globalRivetNodeRegistry;

export type ChatAidonNode = ChartNode<'chatAidon', ChatNodeData>;

//comes from Chatbot
interface SchemaDetail {
  title: string
  description: string
  url: string
  headers: string
  routeMap:  Record<string, string>
  requestInBody: boolean
}

interface FunctionCall {
  name: string
  arguments: string
	id: string
};

class ChatAidonNodeImpl extends ChatNodeImpl {
	create(): ChatAidonNode {
		const chatNode: ChatAidonNode = {
			...this.chartNode,
			type: 'chatAidon',
			title: 'Chat (Aidon)',
		}
		return chatNode
	}

	removeInvalidInputs(inputs: Inputs): Inputs {
		if (!inputs['toolSchemas' as PortId]) {
			const { ['functions' as PortId]: _, ...rest } = inputs
			return rest
		}
		return inputs
	}

	convertToolSchemaToSchemaDetail(toolSchema: GptFunction): SchemaDetail {
		const { name, description, parameters } = toolSchema
		// Assuming the structure of parameters from the example
		const { headers, requestInBody, routeMap, url } = parameters as {
			headers: string
			requestInBody: boolean
			routeMap: Record<string, string>
			url: string
		}
		
		return {
			title: name,
			description,
			url,
			headers,
			routeMap,
			requestInBody
		}
	}

	extractPath(schemaDetail: SchemaDetail, functionName: string, parsedArgs: any) {
		const pathTemplate = Object.keys(schemaDetail.routeMap).find(
			key => schemaDetail.routeMap[key] === functionName
		)
	
		if (!pathTemplate) {
			throw new Error(`Path for function ${functionName} not found`)
		}
	
		const path = pathTemplate.replace(/:(\w+)/g, (_, paramName) => {
			const value = parsedArgs.parameters[paramName]
			if (!value) {
				throw new Error(
					`Parameter ${paramName} not found for function ${functionName}`
				)
			}
			return encodeURIComponent(value)
		})
	
		if (!path) {
			throw new Error(`Path for function ${functionName} not found`)
		}
		return path
	}
	
	async callToolGet(parsedArgs: any, schemaDetail: SchemaDetail, path: string, data: {}) {
		const queryParams = new URLSearchParams(
			parsedArgs.parameters
		).toString()
		const fullUrl = schemaDetail.url + path + (queryParams ? "?" + queryParams : "")
		let headers = {}
	
		// Check if custom headers are set
		const customHeaders = schemaDetail.headers
		if (customHeaders && typeof customHeaders === "string") {
			headers = JSON.parse(customHeaders)
		}
	
		const response = await fetch(fullUrl, {
			method: "GET",
			headers: headers
		})
	
		if (!response.ok) {
			data = {
				error: response.statusText
			}
		} else {
			data = await response.json()
		}
		return data
	}
	
	async callToolPost(schemaDetail: SchemaDetail, path: string, parsedArgs: any, data: {}) {
		let headers = {
			"Content-Type": "application/json"
		}
	
		// Check if custom headers are set
		const customHeaders = schemaDetail.headers // Moved this line up to the loop
	
		// Check if custom headers are set and are of type string
		if (customHeaders && typeof customHeaders === "string") {
			let parsedCustomHeaders = JSON.parse(customHeaders) as Record<
				string, string
			>
	
			headers = {
				...headers,
				...parsedCustomHeaders
			}
		}
	
		const fullUrl = schemaDetail.url + path
	
		const bodyContent = parsedArgs.requestBody || parsedArgs
	
		const requestInit = {
			method: "POST",
			headers,
			body: JSON.stringify(bodyContent) // Use the extracted requestBody or the entire parsedArgs
		}
	
		const response = await fetch(fullUrl, requestInit)
	
		if (!response.ok) {
			data = {
				error: response.statusText
			}
		} else {
			data = await response.json()
		}
		return data
	}
	
	// Override the process function
  async process(inputs: Inputs, context: InternalProcessContext): Promise<Outputs> {
		//make sure not to include functions if we have no way to run them after.
		inputs = this.removeInvalidInputs(inputs)

		// Call the parent class's process method to do its job
		let outputs = await super.process(inputs, context)

		const funcCallOutput = outputs['function-call' as PortId] ?? outputs['function-calls' as PortId];
    const funcCalls = funcCallOutput?.type === 'object[]'
         ? funcCallOutput.value
         : undefined  // coerceTypeOptional(functionCallOutput, 'string[]');

		if (funcCalls !== undefined) {
			const messages = outputs['all-messages' as PortId]
			const toolSchemas = coerceTypeOptional(inputs['toolSchemas' as PortId], 'gpt-function[]')

			const functionCalls: Array<FunctionCall> = funcCalls.map((functionCall) => ({
				name: functionCall.name as string,
				arguments: functionCall.arguments as string,
				id: functionCall.id as string,
			}))

			//call the tool(s) to get the results to add to the message
			for (const functionCall of functionCalls) {
				// Find the schema detail that contains the function name
				const toolSchema = toolSchemas!.find(detail => detail.name == functionCall.name)
				if (!toolSchema) {
          throw new Error(`Function ${functionCall.name} not found in any schema`)
        }

				const schemaDetail = this.convertToolSchemaToSchemaDetail(toolSchema)
				const path = this.extractPath(schemaDetail, functionCall.name, functionCall.arguments)

        // Determine if the request should be in the body or as a query
        let data = {}

        if (schemaDetail.requestInBody) {
          // If the type is set to body
          data = await this.callToolPost(schemaDetail, path, functionCall.arguments, data)
        } else { // If the type is set to query
          data = await this.callToolGet(functionCall.arguments, schemaDetail, path, data)
        }

				(messages!['value'] as ChatMessage[]).push({
					type: "function",
          name: functionCall.id,
          message: JSON.stringify(data)
        })
      }
			
			inputs = omit(inputs, ['functions', 'prompt'])
			inputs['prompt' as PortId] = messages as unknown as DataValue
			outputs = await super.process(inputs, context)
		}

		return outputs;
	}
}

const createPluginNodeImpl = (chatNode: ChartNode): PluginNodeImpl<ChatAidonNode> => {
	const impl = new ChatAidonNodeImpl(chatNode as ChatNode)

	return {
		create(): ChatAidonNode {
			return impl.create()
		},		
		getInputDefinitions(data): NodeInputDefinition[] {
			impl.chartNode.data = data  // Ensure data is set correctly in the base class
			const inputs = impl.getInputDefinitions()
			if (data.enableFunctionUse) {
				inputs.push({
					dataType: ['gpt-function', 'gpt-function[]'] as const,
					id: 'toolSchemas' as PortId,
					title: 'Tool Schemas',
					description: 'The schemas required to run the tool(s) specified in the functions input keyed by function name.',
					coerced: true,
				})
			}
			return inputs
		},
		getOutputDefinitions(data): NodeOutputDefinition[] {
			impl.chartNode.data = data  // Ensure data is set correctly in the base class
			const outputs: NodeOutputDefinition[] = impl.getOutputDefinitions()
			return outputs.filter(output => {
				return output.id !== 'function-calls';
			});
		},
		getEditors(data: ChatNodeData): EditorDefinition<ChatNode>[] {
			impl.chartNode.data = data  // Ensure data is set correctly in the base class
			return impl.getEditors()
		},
		getBody(data): string {
			impl.chartNode.data = data  // Ensure data is set correctly in the base class
			return impl.getBody()
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
			impl.chartNode.data = data  // Ensure data is set correctly in the base class
			return impl.process(inputData, context)
		},
	}
}

export function chatAidonNode() {
	const chatNode:ChartNode = registry.create('chat');
	const chatAidonNodeImpl = createPluginNodeImpl(chatNode)
	return pluginNodeDefinition(chatAidonNodeImpl, 'Chat Aidon Node')
}
