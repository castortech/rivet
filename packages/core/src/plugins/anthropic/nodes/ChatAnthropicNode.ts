import {
  type ChartNode,
  type ChatMessage,
  type EditorDefinition,
  type Inputs,
  type InternalProcessContext,
  type NodeId,
  type NodeInputDefinition,
  type NodeOutputDefinition,
  type NodeUIData,
  type Outputs,
  type PluginNodeImpl,
  type PortId,
  type ScalarDataValue,
  type ChatMessageMessagePart,
} from '../../../index.js';
import {
  type AnthropicModels,
  type ChatCompletionOptions,
  anthropicModelOptions,
  anthropicModels,
  streamChatCompletions,
  AnthropicError,
  type Claude3ChatMessage,
  type Claude3ChatMessageContentPart,
  streamMessageApi,
  type ChatMessageOptions,
  type Claude3ChatMessageTextContentPart,
  type SystemPrompt,
  type ChatMessageCitation,
	type Claude3ChatMessageToolResultContentPart,
} from '../anthropic.js';
import { nanoid } from 'nanoid/non-secure';
import { dedent } from 'ts-dedent';
import retry from 'p-retry';
import { match } from 'ts-pattern';
import { coerceType, coerceTypeOptional } from '../../../utils/coerceType.js';
import { addWarning } from '../../../utils/outputs.js';
import { getError } from '../../../utils/errors.js';
import { pluginNodeDefinition } from '../../../model/NodeDefinition.js';
import { getScalarTypeOf, isArrayDataValue } from '../../../model/DataValue.js';
import type { TokenizerCallInfo } from '../../../integrations/Tokenizer.js';
import { assertNever } from '../../../utils/assertNever.js';
import { isNotNull } from '../../../utils/genericUtilFunctions.js';
import { uint8ArrayToBase64 } from '../../../utils/base64.js';
import { getInputOrData, cleanHeaders } from '../../../utils/inputs.js';

export type ChatAnthropicNode = ChartNode<'chatAnthropic', ChatAnthropicNodeData>;

export type ChatAnthropicNodeConfigData = {
  model: AnthropicModels;
  temperature: number;
  useTopP: boolean;
  top_p?: number;
  top_k?: number;
  maxTokens: number;
  stop?: string;
  enableToolUse?: boolean;
  endpoint?: string;
  overrideModel?: string;
  enableCitations?: boolean;
  headers?: { key: string; value: string }[];
};

export type ChatAnthropicNodeData = ChatAnthropicNodeConfigData & {
  useModelInput: boolean;
  useTemperatureInput: boolean;
  useTopPInput: boolean;
  useTopKInput: boolean;
  useUseTopPInput: boolean;
  useMaxTokensInput: boolean;
  useStop: boolean;
  useStopInput: boolean;
  useEndpointInput: boolean;
  useOverrideModelInput: boolean;
  useHeadersInput?: boolean;

  /** Given the same set of inputs, return the same output without hitting GPT */
  cache: boolean;

  useAsGraphPartialOutput?: boolean;
};

// Temporary
const cache = new Map<string, Outputs>();

export const ChatAnthropicNodeImpl: PluginNodeImpl<ChatAnthropicNode> = {
  create(): ChatAnthropicNode {
    const chartNode: ChatAnthropicNode = {
      type: 'chatAnthropic',
      title: 'Chat (Anthropic)',
      id: nanoid() as NodeId,
      visualData: {
        x: 0,
        y: 0,
        width: 275,
      },
      data: {
        model: 'claude-sonnet-4-20250514',
        useModelInput: false,

        temperature: 0.5,
        useTemperatureInput: false,

        top_p: 1,
        useTopPInput: false,

        top_k: undefined,
        useTopKInput: false,

        useTopP: false,
        useUseTopPInput: false,

        maxTokens: 1024,
        useMaxTokensInput: false,

        useStop: false,
        stop: '',
        useStopInput: false,

        cache: false,
        useAsGraphPartialOutput: true,

        enableToolUse: false,

        endpoint: '',
        useEndpointInput: false,

        overrideModel: undefined,
        useOverrideModelInput: false,

        enableCitations: false,
      },
    };

    return chartNode;
  },

  getInputDefinitions(data): NodeInputDefinition[] {
    const inputs: NodeInputDefinition[] = [];

    if (data.model.startsWith('claude-3')) {
      inputs.push({
        dataType: 'string',
        id: 'system' as PortId,
        title: 'System Prompt',
      });
    }

    if (data.useModelInput) {
      inputs.push({
        id: 'model' as PortId,
        title: 'Model',
        dataType: 'string',
        required: false,
      });
    }

    if (data.useTemperatureInput) {
      inputs.push({
        dataType: 'number',
        id: 'temperature' as PortId,
        title: 'Temperature',
      });
    }

    if (data.useTopPInput) {
      inputs.push({
        dataType: 'number',
        id: 'top_p' as PortId,
        title: 'Top P',
      });
    }

    if (data.useUseTopPInput) {
      inputs.push({
        dataType: 'boolean',
        id: 'useTopP' as PortId,
        title: 'Use Top P',
      });
    }

    if (data.useMaxTokensInput) {
      inputs.push({
        dataType: 'number',
        id: 'maxTokens' as PortId,
        title: 'Max Tokens',
      });
    }

    if (data.useStopInput) {
      inputs.push({
        dataType: 'string',
        id: 'stop' as PortId,
        title: 'Stop',
      });
    }

    inputs.push({
      dataType: ['chat-message', 'chat-message[]'] as const,
      id: 'prompt' as PortId,
      title: 'Prompt',
    });

    if (data.enableToolUse) {
      inputs.push({
        dataType: ['gpt-function', 'gpt-function[]'] as const,
        id: 'tools' as PortId,
        title: 'Tools',
        description: 'Tools to use in the model. To connect multiple tools, use an Array node.',
        coerced: false,
      });
    }

    if (data.useHeadersInput) {
      inputs.push({
        dataType: 'object',
        id: 'headers' as PortId,
        title: 'Headers',
        description: 'Additional headers to send to the API.',
      });
    }

    return inputs;
  },

  getOutputDefinitions(data): NodeOutputDefinition[] {
    const outputs: NodeOutputDefinition[] = [];

    outputs.push({
      dataType: 'string',
      id: 'response' as PortId,
      title: 'Response',
    });

    if (data.enableCitations) {
      outputs.push({
        dataType: 'object[]',
        id: 'citations' as PortId,
        title: 'Citations',
        description: 'Citations from the response, if any.',
      });
    }

    if (data.enableToolUse) {
      outputs.push({
        dataType: 'object[]',
        id: 'function-calls' as PortId,
        title: 'Tool Calls',
        description: 'The tool calls that were made, if any.',
      });
    }

    outputs.push({
      dataType: 'chat-message[]',
      id: 'all-messages' as PortId,
      title: 'All Messages',
      description: 'All messages, with the response appended.',
    });

    return outputs;
  },

  getBody(data): string {
    const modelName = data.overrideModel
      ? data.overrideModel
      : anthropicModels[data.model]?.displayName ?? 'Unknown Model';

    return dedent`
      ${modelName}
      ${
        data.useTopP
          ? `Top P: ${data.useTopPInput ? '(Using Input)' : data.top_p}`
          : `Temperature: ${data.useTemperatureInput ? '(Using Input)' : data.temperature}`
      }
      Max Tokens: ${data.maxTokens}
      ${data.useStop ? `Stop: ${data.useStopInput ? '(Using Input)' : data.stop}` : ''}
    `;
  },

  getEditors(): EditorDefinition<ChatAnthropicNode>[] {
    return [
      {
        type: 'group',
        label: 'Parameters',
        defaultOpen: true,
        editors: [
          {
            type: 'dropdown',
            label: 'Model',
            dataKey: 'model',
            useInputToggleDataKey: 'useModelInput',
            options: anthropicModelOptions,
            disableIf: (d) => !!d.overrideModel?.trim(),
            helperMessage: (d) => (!!d.overrideModel ? `Model is overridden to: ${d.overrideModel}` : ''),
          },
          {
            type: 'number',
            label: 'Temperature',
            dataKey: 'temperature',
            useInputToggleDataKey: 'useTemperatureInput',
            min: 0,
            max: 2,
            step: 0.1,
          },
          {
            type: 'number',
            label: 'Top P',
            dataKey: 'top_p',
            useInputToggleDataKey: 'useTopPInput',
            min: 0,
            max: 1,
            step: 0.1,
          },
          {
            type: 'toggle',
            label: 'Use Top P',
            dataKey: 'useTopP',
            useInputToggleDataKey: 'useUseTopPInput',
          },
          {
            type: 'number',
            label: 'Max Tokens',
            dataKey: 'maxTokens',
            useInputToggleDataKey: 'useMaxTokensInput',
            min: 0,
            max: Number.MAX_SAFE_INTEGER,
            step: 1,
          },
          {
            type: 'string',
            label: 'Stop',
            dataKey: 'stop',
            useInputToggleDataKey: 'useStopInput',
          },
        ],
      },
      {
        type: 'group',
        label: 'Tools',
        editors: [
          {
            type: 'toggle',
            label: 'Enable Tool Use (disables streaming)',
            dataKey: 'enableToolUse',
          },
          {
            type: 'toggle',
            label: 'Enable Citations',
            dataKey: 'enableCitations',
          },
        ],
      },
      {
        type: 'group',
        label: 'Advanced',
        editors: [
          {
            type: 'toggle',
            label: 'Cache (same inputs, same outputs)',
            dataKey: 'cache',
          },
          {
            type: 'toggle',
            label: 'Use for subgraph partial output',
            dataKey: 'useAsGraphPartialOutput',
          },
          {
            type: 'string',
            label: 'Endpoint',
            dataKey: 'endpoint',
            useInputToggleDataKey: 'useEndpointInput',
            helperMessage:
              'Overrides the Anthropic API endpoint. Leave blank to use the default configured endpoint in settings, or https://api.anthropic.com/v1 if none is configured.',
          },
          {
            type: 'string',
            label: 'Override Model',
            dataKey: 'overrideModel',
            useInputToggleDataKey: 'useOverrideModelInput',
            helperMessage: 'Overrides the AI model used for the chat node to this value.',
          },
          {
            type: 'keyValuePair',
            label: 'Headers',
            dataKey: 'headers',
            useInputToggleDataKey: 'useHeadersInput',
            keyPlaceholder: 'Header',
            helperMessage: 'Additional headers to send to the API.',
          },
        ],
      },
    ];
  },

  getUIData(): NodeUIData {
    return {
      infoBoxBody: dedent`
        Makes a call to an Anthropic chat model. The settings contains many options for tweaking the model's behavior.
      `,
      infoBoxTitle: 'Chat (Anthropic) Node',
      contextMenuTitle: 'Chat (Anthropic)',
      group: ['AI'],
    };
  },

  async process(data, inputs: Inputs, context: InternalProcessContext): Promise<Outputs> {
    const output: Outputs = {};
    const rawModel = getInputOrData(data, inputs, 'model');
    const overrideModel = getInputOrData(data, inputs, 'overrideModel');

    const model = (overrideModel || rawModel) as AnthropicModels;

    const temperature = data.useTemperatureInput
      ? coerceTypeOptional(inputs['temperature' as PortId], 'number') ?? data.temperature
      : data.temperature;
    const topP = data.useTopPInput ? coerceTypeOptional(inputs['top_p' as PortId], 'number') ?? data.top_p : data.top_p;
    const useTopP = data.useUseTopPInput
      ? coerceTypeOptional(inputs['useTopP' as PortId], 'boolean') ?? data.useTopP
      : data.useTopP;
    const stop = data.useStopInput
      ? data.useStop
        ? coerceTypeOptional(inputs['stop' as PortId], 'string') ?? data.stop
        : undefined
      : data.stop;
    const tools = data.enableToolUse
      ? coerceTypeOptional(inputs['tools' as PortId], 'gpt-function[]') ?? []
      : undefined;

    const rivetChatMessages = getChatMessages(inputs);
    const messages = await chatMessagesToClaude3ChatMessages(rivetChatMessages);

    let prompt = messages.reduce((acc, message) => {
      const content =
        typeof message.content === 'string'
          ? message.content
          : message.content
              .filter((c): c is Claude3ChatMessageTextContentPart => c.type === 'text')
              .map((c) => c.text ?? '')
              .join('');
      if (message.role === 'user') {
        return `${acc}\n\nHuman: ${content}`;
      } else if (message.role === 'assistant') {
        return `${acc}\n\nAssistant: ${content}`;
      }
      return acc;
    }, '');
    prompt += '\n\nAssistant:';

    // Get the "System" prompt input for Claude 3 models
    const system = data.model.startsWith('claude-3') ? getSystemPrompt(inputs) : undefined;

    let { maxTokens } = data;
    const tokenizerInfo: TokenizerCallInfo = {
      node: context.node,
      model,
      endpoint: undefined,
    };

    const tokenCountEstimate = await context.tokenizer.getTokenCountForString(prompt, tokenizerInfo);
    const modelInfo = anthropicModels[model] ?? {
      maxTokens: Number.MAX_SAFE_INTEGER,
      cost: {
        prompt: 0,
        completion: 0,
      },
    };

    if (tokenCountEstimate >= modelInfo.maxTokens) {
      throw new Error(
        `The model ${model} can only handle ${modelInfo.maxTokens} tokens, but ${tokenCountEstimate} were provided in the prompts alone.`,
      );
    }

    if (tokenCountEstimate + maxTokens > modelInfo.maxTokens) {
      const message = `The model can only handle a maximum of ${
        modelInfo.maxTokens
      } tokens, but the prompts and max tokens together exceed this limit. The max tokens has been reduced to ${
        modelInfo.maxTokens - tokenCountEstimate
      }.`;
      addWarning(output, message);
      maxTokens = Math.floor((modelInfo.maxTokens - tokenCountEstimate) * 0.95); // reduce max tokens by 5% to be safe, calculation is a little wrong.
    }

    const headersFromData = (data.headers ?? []).reduce(
      (acc, header) => {
        acc[header.key] = header.value;
        return acc;
      },
      {} as Record<string, string>,
    );
    const additionalHeaders = data.useHeadersInput
      ? (coerceTypeOptional(inputs['headers' as PortId], 'object') as Record<string, string> | undefined) ??
        headersFromData
      : headersFromData;

    const allAdditionalHeaders = cleanHeaders({
      ...context.settings.chatNodeHeaders,
      ...additionalHeaders,
    });

    try {
      return await retry(
        async () => {
          const completionOptions: Omit<ChatCompletionOptions, 'apiKey' | 'apiEndpoint' | 'signal'> = {
            model,
            temperature: useTopP ? undefined : temperature,
            top_p: useTopP ? topP : undefined,
            max_tokens_to_sample: maxTokens ?? modelInfo.maxTokens,
            stop_sequences: stop ? [stop] : undefined,
            prompt,
          };
          const messageOptions: Omit<ChatMessageOptions, 'apiKey' | 'apiEndpoint' | 'signal'> = {
            model,
            temperature: useTopP ? undefined : temperature,
            top_p: useTopP ? topP : undefined,
            max_tokens: maxTokens ?? modelInfo.maxTokens,
            stop_sequences: stop ? [stop] : undefined,
            system,
            messages,
            tools: tools
              ? tools.map((tool) => ({ name: tool.name, description: tool.description, input_schema: tool.parameters }))
              : undefined,
          };
          const useMessageApi =
            model.startsWith('claude-3') || model.startsWith('claude-sonnet') || model.startsWith('claude-opus');
          const cacheKey = JSON.stringify(useMessageApi ? messageOptions : completionOptions);
          if (data.cache) {
            const cached = cache.get(cacheKey);
            if (cached) {
              return cached;
            }
          }

          const startTime = Date.now();
          const apiKey = context.getPluginConfig('anthropicApiKey');
          const defaultApiEndpoint = context.getPluginConfig('anthropicApiEndpoint') || 'https://api.anthropic.com/v1';

          const configuredEndpoint = getInputOrData(data, inputs, 'endpoint');

          const apiEndpoint = configuredEndpoint?.trim() ? configuredEndpoint : defaultApiEndpoint;

          if (useMessageApi) {
            // Use the messages API for Claude 3 models
            const chunks = streamMessageApi({
              apiEndpoint,
              apiKey: apiKey ?? '',
              signal: context.signal,
              beta: 'prompt-caching-2024-07-31',
              additionalHeaders: allAdditionalHeaders,
              ...messageOptions,
            });

            // Process the response chunks and update the output
            const responseParts: string[] = [];
            let requestTokens: number | undefined = undefined;
            let responseTokens: number | undefined = undefined;
            const citations: ChatMessageCitation[] = [];

            type ToolCall = {
              id: string;
              name: string;
              input: object;
            };

            // Track tool calls
            const toolCalls: ToolCall[] = [];
            let currentToolCall: ToolCall | null = null;
            let accumulatedJsonString = '';

            for await (const chunk of chunks) {
              let completion: string = '';

              if (chunk.type === 'content_block_start') {
                if (chunk.content_block.type === 'text') {
                  completion = chunk.content_block.text || '';
                } else if (chunk.content_block.type === 'tool_use') {
                  currentToolCall = {
                    id: chunk.content_block.id,
                    name: chunk.content_block.name,
                    input: chunk.content_block.input || {},
                  };
                  accumulatedJsonString = '';
                }
              } else if (chunk.type === 'content_block_delta') {
                if (chunk.delta.type === 'text_delta') {
                  completion = chunk.delta.text;
                } else if (chunk.delta.type === 'input_json_delta') {
                  if (currentToolCall) {
                    accumulatedJsonString += chunk.delta.partial_json || '';

                    try {
                      // Try to parse the accumulated JSON
                      const parsedJson = JSON.parse(accumulatedJsonString);
                      currentToolCall.input = parsedJson;
                      accumulatedJsonString = '';
                    } catch (e) {
                      // Not valid JSON yet, keep accumulating
                    }
                  }
                } else if (chunk.delta.type === 'citations_delta') {
                  citations.push(chunk.delta.citation);
                }
              } else if (chunk.type === 'content_block_stop') {
                if (currentToolCall) {
                  if (accumulatedJsonString) {
                    try {
                      const parsedJson = JSON.parse(accumulatedJsonString);
                      currentToolCall.input = parsedJson;
                    } catch (e) {
                      console.warn('Failed to parse tool call JSON input:', accumulatedJsonString);
                    }
                  }

                  toolCalls.push({ ...currentToolCall });
                  currentToolCall = null;
                  accumulatedJsonString = '';
                }
              } else if (chunk.type === 'message_start' && chunk.message?.usage?.input_tokens) {
                requestTokens = chunk.message.usage.input_tokens;
              } else if (chunk.type === 'message_delta' && chunk.delta?.usage?.output_tokens) {
                responseTokens = chunk.delta.usage.output_tokens;
              }

              if (completion) {
                responseParts.push(completion);
              }

              output['response' as PortId] = {
                type: 'string',
                value: responseParts.join('').trim(),
              };

              if (toolCalls.length > 0) {
                output['function-calls' as PortId] = {
                  type: 'object[]',
                  value: toolCalls.map((tool) => ({
                    id: tool.id,
                    name: tool.name,
                    arguments: tool.input,
                  })),
                };
              } else {
                output['function-calls' as PortId] = {
                  type: 'control-flow-excluded',
                  value: undefined,
                };
              }

              output['citations' as PortId] = {
                type: 'object[]',
                value: citations,
              };

              // Format function calls for the ChatMessage interface
              const functionCalls = toolCalls.map((tool) => ({
                name: tool.name,
                arguments: typeof tool.input === 'object' ? JSON.stringify(tool.input) : tool.input,
                id: tool.id,
              }));

              output['all-messages' as PortId] = {
                type: 'chat-message[]',
                value: [
                  ...rivetChatMessages,
                  {
                    type: 'assistant',
                    message: responseParts.join('').trim(),
                    function_call: functionCalls.length === 1 ? functionCalls[0] : undefined,
                    function_calls: functionCalls.length > 0 ? functionCalls : undefined,
                  } satisfies ChatMessage,
                ],
              };

              context.onPartialOutputs?.(output);
            }

            // Final validation
            if (responseParts.length === 0 && toolCalls.length === 0) {
              throw new Error('No response or tool calls received from Anthropic');
            }

            output['requestTokens' as PortId] = { type: 'number', value: requestTokens ?? tokenCountEstimate };
            const responseTokenCount =
              responseTokens ?? (await context.tokenizer.getTokenCountForString(responseParts.join(''), tokenizerInfo));
            output['responseTokens' as PortId] = { type: 'number', value: responseTokenCount };
          } else {
            // Use the normal chat completion method for non-Claude 3 models
            const chunks = streamChatCompletions({
              apiEndpoint,
              apiKey: apiKey ?? '',
              signal: context.signal,
              additionalHeaders: allAdditionalHeaders,
              ...completionOptions,
            });

            // Process the response chunks and update the output
            const responseParts: string[] = [];
            for await (const chunk of chunks) {
              if (!chunk.completion) {
                continue;
              }
              responseParts.push(chunk.completion);
              output['response' as PortId] = {
                type: 'string',
                value: responseParts.join('').trim(),
              };
              context.onPartialOutputs?.(output);
            }

            if (responseParts.length === 0) {
              throw new Error('No response from Anthropic');
            }

            output['all-messages' as PortId] = {
              type: 'chat-message[]',
              value: [
                ...rivetChatMessages,
                {
                  type: 'assistant',
                  message: responseParts.join('').trim(),
                  function_call: undefined,
                  function_calls: undefined,
                } satisfies ChatMessage,
              ],
            };
            output['requestTokens' as PortId] = { type: 'number', value: tokenCountEstimate };
            const responseTokenCount = await context.tokenizer.getTokenCountForString(
              responseParts.join(''),
              tokenizerInfo,
            );
            output['responseTokens' as PortId] = { type: 'number', value: responseTokenCount };
          }

          const cost = getCostForTokens(
            {
              requestTokens: output['requestTokens' as PortId]?.value as number,
              responseTokens: output['responseTokens' as PortId]?.value as number,
            },
            model,
          );
          if (cost != null) {
            output['cost' as PortId] = { type: 'number', value: cost };
          }

          const endTime = Date.now();

          const duration = endTime - startTime;
          output['duration' as PortId] = { type: 'number', value: duration };

          Object.freeze(output);
          cache.set(cacheKey, output);

          return output;
        },
        {
          forever: true,
          retries: 10000,
          maxRetryTime: 1000 * 60 * 5,
          factor: 2.5,
          minTimeout: 500,
          maxTimeout: 5000,
          randomize: true,
          signal: context.signal,
          onFailedAttempt(err) {
            context.trace(`ChatAnthropicNode failed, retrying: ${err.toString()}`);

            if (context.signal.aborted) {
              throw new Error('Aborted');
            }

            if (err instanceof AnthropicError) {
              if (err.response.status >= 400 && err.response.status < 500) {
                if ((err.responseJson as any).error?.message) {
                  throw new Error((err.responseJson as any).error.message);
                }
              }
            }
          },
        },
      );
    } catch (error) {
      context.trace(getError(error).stack ?? 'Missing stack');
      throw new Error(`Error processing ChatAnthropicNode: ${(error as Error).message}`);
    }
  },
};

export const chatAnthropicNode = pluginNodeDefinition(ChatAnthropicNodeImpl, 'Chat');

export function getSystemPrompt(inputs: Inputs): SystemPrompt | undefined {
  const systemInput = inputs['system' as PortId];

  const system = coerceTypeOptional(systemInput, 'string');

  if (system) {
    return [
      {
        type: 'text',
        text: system,
        cache_control:
          systemInput?.type === 'chat-message'
            ? systemInput.value.isCacheBreakpoint
              ? { type: 'ephemeral' }
              : null
            : null,
      },
    ];
  }

  const prompt = inputs['prompt' as PortId];
  if (prompt && prompt.type === 'chat-message[]') {
    const systemMessages = prompt.value.filter((message) => message.type === 'system');
    if (systemMessages.length) {
      const converted = systemMessages.map((message) => {
        return {
          type: 'text' as const,
          text: coerceType({ type: 'chat-message', value: message }, 'string'),
          cache_control: message.isCacheBreakpoint ? { type: 'ephemeral' as const } : null,
        };
      });

      return converted;
    }
  }

  return undefined;
}

function getChatMessages(inputs: Inputs) {
  const prompt = inputs['prompt' as PortId];
  if (!prompt) {
    throw new Error('Prompt is required');
  }

  const chatMessages = match(prompt)
    .with({ type: 'chat-message' }, (p) => [p.value])
    .with({ type: 'chat-message[]' }, (p) => p.value)
    .with({ type: 'string' }, (p): ChatMessage[] => [{ type: 'user', message: p.value }])
    .with({ type: 'string[]' }, (p): ChatMessage[] => p.value.map((v) => ({ type: 'user', message: v })))
    .otherwise((p): ChatMessage[] => {
      if (isArrayDataValue(p)) {
        const stringValues = (p.value as readonly unknown[]).map((v) =>
          coerceType(
            {
              type: getScalarTypeOf(p.type),
              value: v,
            } as ScalarDataValue,
            'string',
          ),
        );

        return stringValues.filter((v) => v != null).map((v) => ({ type: 'user', message: v }));
      }

      const coercedMessage = coerceType(p, 'chat-message');
      if (coercedMessage != null) {
        return [coercedMessage];
      }

      const coercedString = coerceType(p, 'string');
      return coercedString != null ? [{ type: 'user', message: coerceType(p, 'string') }] : [];
    });

  return chatMessages;
}

export async function chatMessagesToClaude3ChatMessages(chatMessages: ChatMessage[]): Promise<Claude3ChatMessage[]> {
  const messages: Claude3ChatMessage[] = (await Promise.all(chatMessages.map(chatMessageToClaude3ChatMessage))).filter(
    isNotNull,
  );

  // Combine sequential tool_result messages into a single user message with multiple content items
  const combinedMessages = messages.reduce<Claude3ChatMessage[]>((acc, message) => {
    if (
      message.role === 'user' &&
      Array.isArray(message.content) &&
      message.content.length === 1 &&
      message.content[0]!.type === 'tool_result'
    ) {
      const last = acc.at(-1);
      if (last?.role === 'user' && Array.isArray(last.content) && last.content.every((c) => c.type === 'tool_result')) {
        const content = last.content.concat(message.content as Claude3ChatMessageToolResultContentPart[]);
        return [...acc.slice(0, -1), { ...last, content }];
      }
    }

    return [...acc, message];
  }, []);

  return combinedMessages;
}

async function chatMessageToClaude3ChatMessage(message: ChatMessage): Promise<Claude3ChatMessage | undefined> {
  if (message.type === 'system') {
    return undefined;
  }

  if (message.type === 'function') {
    // Interpret function messages as user messages with tool_result content items (making Claude API more similar to OpenAI's)
    const content = (Array.isArray(message.message) ? message.message : [message.message])
      .map((m) => (typeof m === 'string' ? { type: 'text' as const, text: m } : undefined))
      .filter(isNotNull);
    return {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: message.name,
          content: content.length === 1 ? content[0]!.text : content,
          cache_control: message.isCacheBreakpoint ? { type: 'ephemeral' } : null,
        },
      ],
    };
  }

  const content = Array.isArray(message.message)
    ? await Promise.all(message.message.map((part) => chatMessageContentToClaude3ChatMessage(part)))
    : [await chatMessageContentToClaude3ChatMessage(message.message)];

  if (message.type === 'assistant' && message.function_calls) {
    content.push(
      ...message.function_calls.map((fc) => ({
        type: 'tool_use' as const,
        id: fc.id!,
        name: fc.name,
        input: JSON.parse(fc.arguments),
        cache_control: message.isCacheBreakpoint ? { type: 'ephemeral' as const } : null,
      })),
    );
  } else if (message.type === 'assistant' && message.function_call) {
    content.push({
      type: 'tool_use',
      id: message.function_call.id!,
      name: message.function_call.name,
      input: JSON.parse(message.function_call.arguments),
      cache_control: message.isCacheBreakpoint ? { type: 'ephemeral' } : null,
    });
  }

  // If the message is a cache breakpoint, cache using the last content item of the message
  if (message.isCacheBreakpoint) {
    content.at(-1)!.cache_control = { type: 'ephemeral' };
  }

  return {
    role: message.type,
    content,
  };
}

async function chatMessageContentToClaude3ChatMessage(
  content: ChatMessageMessagePart,
): Promise<Claude3ChatMessageContentPart> {
  if (typeof content === 'string') {
    return {
      type: 'text',
      text: content,
      cache_control: null, // set later
    };
  }
  switch (content.type) {
    case 'image':
      return {
        type: 'image',
        source: {
          type: 'base64' as const,
          media_type: content.mediaType as string,
          data: (await uint8ArrayToBase64(content.data)) ?? '',
        },
        cache_control: null, // set later
      };
    case 'url':
      throw new Error('unable to convert urls for Claude');
    case 'document':
      return {
        type: 'document',
        source: {
          type: 'base64' as const,
          data: (await uint8ArrayToBase64(content.data)) ?? '',
          media_type: content.mediaType as string,
        },
        title: content.title?.trim() ? content.title.trim() : undefined,
        context: content.context?.trim() ? content.context.trim() : undefined,
        citations: content.enableCitations ? { enabled: true } : undefined,
        cache_control: null, // set later
      };
    default:
      assertNever(content);
  }
}

function getCostForTokens(
  tokenCounts: { requestTokens: number; responseTokens: number },
  model: AnthropicModels,
): number | undefined {
  const modelInfo = anthropicModels[model];
  if (modelInfo == null) {
    return undefined;
  }
  return modelInfo.cost.prompt * tokenCounts.requestTokens + modelInfo.cost.completion * tokenCounts.responseTokens;
}
