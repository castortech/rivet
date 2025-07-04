import { NodeRegistration } from './NodeRegistration.js';

import { userInputNode } from './nodes/UserInputNode.js';
export * from './nodes/UserInputNode.js';

import { textNode } from './nodes/TextNode.js';
export * from './nodes/TextNode.js';

import { chatNode } from './nodes/ChatNode.js';
export * from './nodes/ChatNode.js';
export * from './nodes/ChatNodeBase.js';

import { promptNode } from './nodes/PromptNode.js';
export * from './nodes/PromptNode.js';

import { extractRegexNode } from './nodes/ExtractRegexNode.js';
export * from './nodes/ExtractRegexNode.js';

import { codeNode } from './nodes/CodeNode.js';
export * from './nodes/CodeNode.js';

import { matchNode } from './nodes/MatchNode.js';
export * from './nodes/MatchNode.js';

import { ifNode } from './nodes/IfNode.js';
export * from './nodes/IfNode.js';

import { readDirectoryNode } from './nodes/ReadDirectoryNode.js';
export * from './nodes/ReadDirectoryNode.js';

import { readFileNode } from './nodes/ReadFileNode.js';
export * from './nodes/ReadFileNode.js';

import { writeFileNode } from './nodes/WriteFileNode.js';
export * from './nodes/WriteFileNode.js';

import { ifElseNode } from './nodes/IfElseNode.js';
export * from './nodes/IfElseNode.js';

import { chunkNode } from './nodes/ChunkNode.js';
export * from './nodes/ChunkNode.js';

import { graphInputNode } from './nodes/GraphInputNode.js';
export * from './nodes/GraphInputNode.js';

import { graphOutputNode } from './nodes/GraphOutputNode.js';
export * from './nodes/GraphOutputNode.js';

import { subGraphNode } from './nodes/SubGraphNode.js';
export * from './nodes/SubGraphNode.js';

import { arrayNode } from './nodes/ArrayNode.js';
export * from './nodes/ArrayNode.js';

import { extractJsonNode } from './nodes/ExtractJsonNode.js';
export * from './nodes/ExtractJsonNode.js';

import { assemblePromptNode } from './nodes/AssemblePromptNode.js';
export * from './nodes/ExtractYamlNode.js';

import { loopControllerNode } from './nodes/LoopControllerNode.js';
export * from './nodes/AssemblePromptNode.js';

import { trimChatMessagesNode } from './nodes/TrimChatMessagesNode.js';
export * from './nodes/LoopControllerNode.js';

import { extractYamlNode } from './nodes/ExtractYamlNode.js';
export * from './nodes/TrimChatMessagesNode.js';

import { externalCallNode } from './nodes/ExternalCallNode.js';
export * from './nodes/ExternalCallNode.js';

import { extractObjectPathNode } from './nodes/ExtractObjectPathNode.js';
export * from './nodes/ExtractObjectPathNode.js';

import { raiseEventNode } from './nodes/RaiseEventNode.js';
export * from './nodes/RaiseEventNode.js';

import { contextNode } from './nodes/ContextNode.js';
export * from './nodes/ContextNode.js';

import { coalesceNode } from './nodes/CoalesceNode.js';
export * from './nodes/CoalesceNode.js';

import { passthroughNode } from './nodes/PassthroughNode.js';
export * from './nodes/PassthroughNode.js';

import { popNode } from './nodes/PopNode.js';
export * from './nodes/PopNode.js';

import { setGlobalNode } from './nodes/SetGlobalNode.js';
export * from './nodes/SetGlobalNode.js';

import { getGlobalNode } from './nodes/GetGlobalNode.js';
export * from './nodes/GetGlobalNode.js';

import { waitForEventNode } from './nodes/WaitForEventNode.js';
export * from './nodes/WaitForEventNode.js';

import { gptFunctionNode } from './nodes/ToolNode.js';
export * from './nodes/ToolNode.js';

import { toYamlNode } from './nodes/ToYamlNode.js';
export * from './nodes/ToYamlNode.js';

import { getEmbeddingNode } from './nodes/GetEmbeddingNode.js';
export * from './nodes/GetEmbeddingNode.js';

import { vectorStoreNode } from './nodes/VectorStoreNode.js';
export * from './nodes/VectorStoreNode.js';

import { vectorNearestNeighborsNode } from './nodes/VectorNearestNeighborsNode.js';
export * from './nodes/VectorNearestNeighborsNode.js';

import { hashNode } from './nodes/HashNode.js';
export * from './nodes/HashNode.js';

import { abortGraphNode } from './nodes/AbortGraphNode.js';
export * from './nodes/AbortGraphNode.js';

import { raceInputsNode } from './nodes/RaceInputsNode.js';
export * from './nodes/RaceInputsNode.js';

import { toJsonNode } from './nodes/ToJsonNode.js';
export * from './nodes/ToJsonNode.js';

import { joinNode } from './nodes/JoinNode.js';
export * from './nodes/JoinNode.js';

import { filterNode } from './nodes/FilterNode.js';
export * from './nodes/FilterNode.js';

import { objectNode } from './nodes/ObjectNode.js';
export * from './nodes/ObjectNode.js';

import { booleanNode } from './nodes/BooleanNode.js';
export * from './nodes/BooleanNode.js';

import { compareNode } from './nodes/CompareNode.js';
export * from './nodes/CompareNode.js';

import { evaluateNode } from './nodes/EvaluateNode.js';
export * from './nodes/EvaluateNode.js';

import { numberNode } from './nodes/NumberNode.js';
export * from './nodes/NumberNode.js';

import { randomNumberNode } from './nodes/RandomNumberNode.js';
export * from './nodes/RandomNumberNode.js';

import { shuffleNode } from './nodes/ShuffleNode.js';
export * from './nodes/ShuffleNode.js';

import { commentNode } from './nodes/CommentNode.js';
export * from './nodes/CommentNode.js';

import { imageToMDNode } from './nodes/ImageToMDNode.js';
export * from './nodes/ImageToMDNode.js';

import { imageNode } from './nodes/ImageNode.js';
export * from './nodes/ImageNode.js';

import { audioNode } from './nodes/AudioNode.js';
export * from './nodes/AudioNode.js';

import { httpCallNode } from './nodes/HttpCallNode.js';
export * from './nodes/HttpCallNode.js';

import { delayNode } from './nodes/DelayNode.js';
export * from './nodes/DelayNode.js';

import { appendToDatasetNode } from './nodes/AppendToDatasetNode.js';
export * from './nodes/AppendToDatasetNode.js';

import { createDatasetNode } from './nodes/CreateDatasetNode.js';
export * from './nodes/CreateDatasetNode.js';

import { loadDatasetNode } from './nodes/LoadDatasetNode.js';
export * from './nodes/LoadDatasetNode.js';

import { getAllDatasetsNode } from './nodes/GetAllDatasetsNode.js';
export * from './nodes/GetAllDatasetsNode.js';

import { splitNode } from './nodes/SplitNode.js';
export * from './nodes/SplitNode.js';

import { datasetNearestNeighborsNode } from './nodes/DatasetNearestNeigborsNode.js';
export * from './nodes/DatasetNearestNeigborsNode.js';

import { getDatasetRowNode } from './nodes/GetDatasetRowNode.js';
export * from './nodes/GetDatasetRowNode.js';

import { sliceNode } from './nodes/SliceNode.js';
export * from './nodes/SliceNode.js';

import { extractMarkdownCodeBlocksNode } from './nodes/ExtractMarkdownCodeBlocksNode.js';
export * from './nodes/ExtractMarkdownCodeBlocksNode.js';

import { assembleMessageNode } from './nodes/AssembleMessageNode.js';
export * from './nodes/AssembleMessageNode.js';

import { urlReferenceNode } from './nodes/URLReferenceNode.js';
export * from './nodes/URLReferenceNode.js';

import { destructureNode } from './nodes/DestructureNode.js';
export * from './nodes/DestructureNode.js';

import { replaceDatasetNode } from './nodes/ReplaceDatasetNode.js';
export * from './nodes/ReplaceDatasetNode.js';

import { listGraphsNode } from './nodes/ListGraphsNode.js';
export * from './nodes/ListGraphsNode.js';

import { graphReferenceNode } from './nodes/GraphReferenceNode.js';
export * from './nodes/GraphReferenceNode.js';

import { callGraphNode } from './nodes/CallGraphNode.js';
export * from './nodes/CallGraphNode.js';

import { delegateFunctionCallNode } from './nodes/DelegateFunctionCallNode.js';
export * from './nodes/DelegateFunctionCallNode.js';

import { playAudioNode } from './nodes/PlayAudioNode.js';
export * from './nodes/PlayAudioNode.js';

import { documentNode } from './nodes/DocumentNode.js';
export * from './nodes/DocumentNode.js';

import { chatLoopNode } from './nodes/ChatLoopNode.js';
export * from './nodes/ChatLoopNode.js';

import { readAllFilesNode } from './nodes/ReadAllFilesNode.js';
export * from './nodes/ReadAllFilesNode.js';

import { toMarkdownTableNode } from './nodes/ToMarkdownTableNode.js';
export * from './nodes/ToMarkdownTableNode.js';

import { cronNode } from './nodes/CronNode.js';
export * from './nodes/CronNode.js';

import { toTreeNode } from './nodes/ToTreeNode.js';
export * from './nodes/ToTreeNode.js';

import { loopUntilNode } from './nodes/LoopUntilNode.js';
export * from './nodes/LoopUntilNode.js';

import { mcpDiscoveryNode } from './nodes/MCPDiscoveryNode.js';
export * from './nodes/MCPDiscoveryNode.js';

import { mcpToolCallNode } from './nodes/MCPToolCallNode.js';
export * from './nodes/MCPToolCallNode.js';

import { mcpGetPromptNode } from './nodes/MCPGetPromptNode.js';
export * from './nodes/MCPGetPromptNode.js';

import { referencedGraphAliasNode } from './nodes/ReferencedGraphAliasNode.js';
export * from './nodes/ReferencedGraphAliasNode.js';

export const registerBuiltInNodes = (registry: NodeRegistration) => {
  return registry
    .register(toYamlNode)
    .register(userInputNode)
    .register(textNode)
    .register(chatNode)
    .register(promptNode)
    .register(extractRegexNode)
    .register(codeNode)
    .register(matchNode)
    .register(ifNode)
    .register(readDirectoryNode)
    .register(readFileNode)
    .register(writeFileNode)
    .register(ifElseNode)
    .register(chunkNode)
    .register(graphInputNode)
    .register(graphOutputNode)
    .register(subGraphNode)
    .register(arrayNode)
    .register(extractJsonNode)
    .register(assemblePromptNode)
    .register(loopControllerNode)
    .register(trimChatMessagesNode)
    .register(extractYamlNode)
    .register(externalCallNode)
    .register(extractObjectPathNode)
    .register(raiseEventNode)
    .register(contextNode)
    .register(coalesceNode)
    .register(passthroughNode)
    .register(popNode)
    .register(setGlobalNode)
    .register(getGlobalNode)
    .register(waitForEventNode)
    .register(gptFunctionNode)
    .register(getEmbeddingNode)
    .register(vectorStoreNode)
    .register(vectorNearestNeighborsNode)
    .register(hashNode)
    .register(abortGraphNode)
    .register(raceInputsNode)
    .register(toJsonNode)
    .register(joinNode)
    .register(filterNode)
    .register(objectNode)
    .register(booleanNode)
    .register(compareNode)
    .register(evaluateNode)
    .register(numberNode)
    .register(randomNumberNode)
    .register(shuffleNode)
    .register(commentNode)
		.register(imageToMDNode)
    .register(imageNode)
    .register(audioNode)
    .register(httpCallNode)
    .register(delayNode)
    .register(appendToDatasetNode)
    .register(createDatasetNode)
    .register(loadDatasetNode)
    .register(getAllDatasetsNode)
    .register(splitNode)
    .register(datasetNearestNeighborsNode)
    .register(getDatasetRowNode)
    .register(sliceNode)
    .register(extractMarkdownCodeBlocksNode)
    .register(assembleMessageNode)
    .register(urlReferenceNode)
    .register(destructureNode)
    .register(replaceDatasetNode)
    .register(listGraphsNode)
    .register(graphReferenceNode)
    .register(callGraphNode)
    .register(delegateFunctionCallNode)
    .register(playAudioNode)
    .register(documentNode)
    .register(chatLoopNode)
    .register(readAllFilesNode)
    .register(toMarkdownTableNode)
    .register(cronNode)
    .register(toTreeNode)
    .register(loopUntilNode)
    .register(mcpDiscoveryNode)
    .register(mcpToolCallNode)
    .register(mcpGetPromptNode)
    .register(referencedGraphAliasNode);
};

let globalRivetNodeRegistry = registerBuiltInNodes(new NodeRegistration());

export { globalRivetNodeRegistry };

export type BuiltInNodes = typeof globalRivetNodeRegistry.NodesType;

export type BuiltInNodeType = typeof globalRivetNodeRegistry.NodeTypesType;

export type NodeOfType<T extends BuiltInNodeType> = Extract<BuiltInNodes, { type: T }>;

/** Resets the global node registry to a fresh one with only built-in nodes registered. */
export function resetGlobalRivetNodeRegistry() {
  globalRivetNodeRegistry = registerBuiltInNodes(new NodeRegistration());
}
