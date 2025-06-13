---
id: serve
sidebar_label: serve
---

# Rivet CLI - `serve` Command

Serve a Rivet project using a local server.

## Quick Start

```bash
# Start server with default settings
npx @ironclad/rivet-cli serve

# Start server on custom port
npx @ironclad/rivet-cli serve --port 8080

# Start server in development mode
npx @ironclad/rivet-cli serve --dev
```

## Description

The `serve` command starts a local HTTP server that hosts your Rivet project, allowing you to execute graphs via HTTP requests. This is particularly useful for:

- Testing graphs in a production-like environment
- Integrating Rivet graphs into other applications
- Running graphs from scripts or automated tools
- Development and debugging of graph implementations

## Usage

The basic usage will serve the project file in the current directory, using the default port of 3000:

```bash
npx @ironclad/rivet-cli serve
```

You can also specify a different project file (which can also be specified via environment variable `PROJECT_FILE`) or port:

```bash
npx @ironclad/rivet-cli serve my-project.rivet-project --port 8080
```

Once the server is running, you can make POST requests to the server to run graphs.

## Inputs

Inputs to graphs are provided via the request body of the HTTP request. The request body should be a JSON object with the input values.

Input values should be provided as [Data Values](../user-guide/data-types.md), except for simple types like strings, numbers, and booleans.

For example, for a graph with two inputs, `input1` (string) and `input2` (object),
the request body should look like this:

```json
{
  "input1": "Hello, World!",
  "input2": {
    "type": "object",
    "value": {
      "key1": "value1",
      "key2": 42
    }
  }
}
```

## Outputs

The server will respond with a JSON object that contains the output values of the graph. Each Graph Output node in the graph will correspond to a key in the output JSON object.

The value of each property will be a [Data Value](../user-guide/data-types.md) object, with a `type` property and a `value` property.

For example, if a graph has two Graph Output Nodes, `output1` (a string) and `output2` (a number), the output JSON object will look like this:

```json
{
  "output1": {
    "type": "string",
    "value": "Hello, World!"
  },
  "output2": {
    "type": "number",
    "value": 42
  }
}
```

## Endpoints

### `POST /`

Run the main graph in the project file. The request body should contain the input values as described above.

Outputs a JSON object with the output values of the graph.

### `POST/:graphId`

This is only enabled if the `--allow-specifying-graph-id` flag is used. This endpoint runs a specific graph in the project file.

The request body should contain the input values as described above.

Outputs a JSON object with the output values of the graph.

### `POST/path/to/projectfile::[graphId]`

This is only enabled if the `--projects-root-dir` flag is used. This endpoint runs a specific project file and optionally a specific graph in that project file.

The request body should contain the input values as described above.

Outputs a JSON object with the output values of the graph.

## Options

### Passing in options

Options can be part of the serve command line or supplied via environment or supplied in a request via a special input called 'runParams'.

All options can be passed in via the command line and most options that are not required to start the server can be passed in via environment
and those that affect an execution can be passed in via the 'runParams' input.

Options are first taken from the command line, then the environment and finally the 'runParams' input.

### Server Configuration

- `--port <port>`: The port to run the server on. Default is 3000. Environment: `SERVE_PORT`, RunParams: N/A.
- `--hostame <hostname>`: The hostname to run the server with. Default is `loclahost`. Environment: `SERVE_PORT`, RunParams: N/A.
- `--dev`: Runs the server in development mode, which will reread the project file on each request. Useful for development.
					Environment NODE_ENV === 'development', RunParams: N/A.

### Graph Selection

- `--graph <graphNameOrId>`: The name or ID of the graph to run. If not provided, the main graph will be run.
															If there is no main graph, an error will be returned. Environment: `GRAPH`, RunParams: N/A.
- `--allow-specifying-graph-id`: Allows specifying the graph ID in the URL path. This is disabled by default.
															Environment: `ALLOW_SPECIFYING_GRAPH_ID`, RunParams: N/A.
- `--projects-root-dir`: Specifies the root directory where project files are located.
			If specified, a projectFile argument will be a relative path to this directory. Environment: `PROJECTS_ROOT_DIR`, RunParams: N/A.

### OpenAI Configuration

- `--openai-api-key`: The OpenAI API key to use for the Chat node. Required if the project uses OpenAI functionality or otherwise requires an API key.
											Environment: `OPENAI_API_KEY`, RunParams: `openaiApiKey`.
- `--openai-endpoint`: The OpenAI API endpoint to use for the Chat node. Default is `https://api.openai.com/v1/chat/completions`.
											Environment: `OPENAI_ENDPOINT`, RunParams: `openaiEndpoint`.
- `--openai-organization`: The OpenAI organization ID to use. Environment: `OPENAI_ORGANIZATION`, RunParams: `openaiOrganization`.

### Streaming

Here are the options for streaming, please see the section [Streaming Mode](#streaming-mode) for more information.

- `--stream`: Activates streaming mode. Can also be used with argument to specify nodes and events to stream. Disabled by default.
							Environment: `STREAM` (note that it should be an empty string), RunParams: `stream`.
- `--stream-node`: When streaming mode is active, provide streaming text from a specified chat node. Disabled by default.
							Environment: `STREAM_NODE`, RunParams: `streamNode`.

### Monitoring

Here are the options for monitoring, please see the section [Monitoring Info](#monitoring-info) for more information.

- `--expose-cost`: Exposes the graph run cost as a property in the JSON response object. Disabled by default.
									Environment: `EXPOSE_COST`, RunParams: `exposeCost`.
- `--expose-usage`: Exposes the graph token counts and chat usage detail as a property in the JSON response object. Disabled by default.
					Environment `EXPOSE_USAGE`, RunParams: `exposeUsage`.

### Logging

- `--log-requests`: Determines if all requests (except health checks) will be logged via Hono logger. Disabled by default.
						Environment: `LOG_REQUESTS`, RunParams: N/A.
- `--log-activity`: Determines if basic activity should be logged during processing. Disabled by default.
						Environment: `LOG_ACTIVITY`, RunParams: N/A.
- `--log-trace`: Determines if includeTrace should be turned on during graph processing. Disabled by default.
						Environment: `LOG_TRACE`, RunParams: `logTrace`.

## Plugins

The server also supports being configured to run with any plugin that can be installed in the application. Plugins are activated and configured via
environment variables. A full list of the plugins and their available variables is displayed upon server startup.

Plugins are activated via `NAME_PLUGIN = true`

## Examples

### Running a Simple Graph

Request:

```bash
curl -X POST http://localhost:3000 -H "Content-Type: application/json" -d '{
  "name": "Alice",
  "age": 30
}'
```

Response:

```json
{
  "greeting": {
    "type": "string",
    "value": "Hello, Alice!"
  },
  "canVote": {
    "type": "boolean",
    "value": true
  }
}
```

## Security Considerations

- The server is intended for development and testing purposes
- No authentication is provided by the server, so it should not be exposed to the internet without additional security measures.
- Consider running behind a reverse proxy if exposed to the internet, to add security features like SSL, rate limiting, and authentication.
- Use environment variables for sensitive configuration like API keys

## Streaming Mode

`rivet serve` exposes two different streaming modes depending on the application you will be integrating with. In both cases, the server will
stream events in the SSE (Server-Sent Events) format, which is a simple and efficient way to stream data from the server to the client.

### Rivet Events Streaming Mode

By default, when `--stream` is provided without any value, the server will stream ALL events in the Rivet Events format.
This format is designed for application that understand the Rivet Events system, and can handle the events appropriately.

Here is an example of streamed responses in Rivet Events format:

```json
event: nodeStart
data: {
    "inputs": {
        "prompt": {
            "type": "string",
            "value": "h4110"
        }
    },
    "nodeId": "vzC9lcEyXZ2Q1-cCaG0v4",
    "nodeTitle": "Chat",
    "type": "nodeStart"
}

event: partialOutput
data: {
    "delta": "",
    "nodeId": "vzC9lcEyXZ2Q1-cCaG0v4",
    "nodeTitle": "Chat",
    "type": "partialOutput"
}

event: partialOutput
data: {
    "delta": "It seems like you entered \"h",
    "nodeId": "vzC9lcEyXZ2Q1-cCaG0v4",
    "nodeTitle": "Chat",
    "type": "partialOutput"
}

event: partialOutput
data: {
    "delta": "4110.\" Could",
    "nodeId": "vzC9lcEyXZ2Q1-cCaG0v4",
    "nodeTitle": "Chat",
    "type": "partialOutput"
}

event: partialOutput
data: {
    "delta": " you please provide more context or clarify what you would like to know or",
    "nodeId": "vzC9lcEyXZ2Q1-cCaG0v4",
    "nodeTitle": "Chat",
    "type": "partialOutput"
}

event: partialOutput
data: {
    "delta": " discuss regarding that term?",
    "nodeId": "vzC9lcEyXZ2Q1-cCaG0v4",
    "nodeTitle": "Chat",
    "type": "partialOutput"
}

event: nodeFinish
data: {
    "nodeId": "vzC9lcEyXZ2Q1-cCaG0v4",
    "nodeTitle": "Chat",
    "outputs": {
        "__hidden_token_count": {
            "type": "number",
            "value": 68
        },
        "all-messages": {
            "type": "chat-message[]",
            "value": [
                {
                    "message": "h4110",
                    "type": "user"
                },
                {
                    "message": "It seems like you entered \"h4110.\" Could you please provide more context or clarify what you would like to know or discuss regarding that term?",
                    "type": "assistant"
                }
            ]
        },
        "cost": {
            "type": "number",
            "value": 2.475e-05
        },
        "duration": {
            "type": "number",
            "value": 846
        },
        "in-messages": {
            "type": "chat-message[]",
            "value": [
                {
                    "message": "h4110",
                    "type": "user"
                }
            ]
        },
        "requestTokens": {
            "type": "number",
            "value": 10
        },
        "response": {
            "type": "string",
            "value": "It seems like you entered \"h4110.\" Could you please provide more context or clarify what you would like to know or discuss regarding that term?"
        },
        "responseTokens": {
            "type": "number",
            "value": 58
        },
        "usage": {
            "type": "object",
            "value": {
                "completion_cost": 2.325e-05,
                "completion_tokens": 31,
                "completion_tokens_details": {
                    "accepted_prediction_tokens": 0,
                    "audio_tokens": 0,
                    "reasoning_tokens": 0,
                    "rejected_prediction_tokens": 0
                },
                "prompt_cost": 1.4999999999999998e-06,
                "prompt_tokens": 10,
                "prompt_tokens_details": {
                    "audio_tokens": 0,
                    "cached_tokens": 0
                },
                "total_cost": 2.475e-05,
                "total_tokens": 41
            }
        }
    },
    "type": "nodeFinish"
}
```

You can see that the server is streaming events like `nodeStart`, `partialOutputs`, and `nodeFinish`. The data for each of the events is
a JSON object with the relevant information for that event.

#### Selective Streaming Mode

If you pass an argument value to the `stream` option, you can control which node or nodes are streamed and the type of events to stream.
This is useful if you are only interested in the events for specific nodes in the graph or just some event types.

First, nodes are identified by either their Id or Title. Here Id is either the internal generated Id (i.e. "vzC9lcEyXZ2Q1-cCaG0v4")
or the id entered in the node itself on Graph Input or Graph Output.

The argument to stream takes a comma-separated list of node with an optional event type selector.

Each node in the list is of the form: `<NodeId/NodeTitle>[SFD]` where the first part is the node id or title followed by an optional type selector,
which uses an event list enclosed in square bracket. The valid values are `S`tart, `F`inish and `D`elta (partial output).

As an exmple we could have: `chat[FD],output[F]` to stream delta and finish event from the chat node and also to stream the finish even on the output node.
This gives you full flexibility to target exactly the content that you care about.


### Text Streaming Mode

If you are integrating with a simple application that only likes having text responses, you can set `--stream-node=<ChatNodeId>` / `--stream-node=<ChatNodeTitle>` and `--stream` together.

You should only specify Chat nodes for this mode, as other nodes like Graph Output nodes may not have partial outputs that support this.

This will cause the streaming to look like the following:

```
data: ""

data: "It seems like you entered \"h"

data: "4110,\" which could refer"

data: " to a variety of things depending on the context."

data: " It could be a model number, a"

data: " code, or something else."

data: " Could you please provide more details or clarify what you"

data: " are referring to?"

data: " This will help me assist you better!"
```

You can see that each `data` event contains a delta of the response text from the node.

## Monitoring Info

There are two monitoring options, expose cost and expose usage. Their behavior is dependant on the execution mode that you are using.
If not configured this information will be omitted.

The `--expose-cost` controls the `cost` object and the `--expose-usage` controls the `requestTokens`, `responseTokens` and `usages` objects.

The `usages` object is an array of `usage` object returned by the LLM. It will collect all such `usage` objects as emitted by graph.

### Run Graph Mode

In non-streaming mode, you are receiving a single response called the `GraphOutputs` that can include both a `cost` section and
the token counts under `requestTokens` and `responseTokens`. There will not be any `usage` content usually coming from the chat node.

#### Example

```json
{
	"output": {
		"type": "string",
		"value": "I am an artificial intelligence language model developed by OpenAI, ..."
	},
	"requestTokens": {
		"type": "number",
		"value": 16
	},
	"responseTokens": {
		"type": "number",
		"value": 981
	},
	"cost": {
		"type": "number",
		"value": 0.00041865000000000007
	}
}
```

### Stream Mode

In pure stream mode, it will put the monitoring content in the `done` event with the `graphOutput` object.

#### Example

Request:
```json
{ "input": "What do you do, explain in details?", "runParams" : { "exposeCost":true, "exposeUsage":true, "stream":"chat[D]" }}'
```
Response:
```json
event: partialOutput
data: {"type":"partialOutput","nodeId":"N5YyV-zlVYCi6iuodTSwQ","nodeTitle":"chat","delta":""}
...
event: partialOutput
data: {"type":"partialOutput","nodeId":"N5YyV-zlVYCi6iuodTSwQ","nodeTitle":"chat","delta":" contexts."}

event: done
data: {"type":"done","graphOutput":{"requestTokens":{"type":"number","value":16},"responseTokens":{"type":"number","value":1100},"cost":{"type":"number","value":0.00046665},"usages":{"type":"any[]","value":[{"type":"object","value":{"prompt_tokens":16,"completion_tokens":619,"total_tokens":635,"prompt_tokens_details":{"cached_tokens":0,"audio_tokens":0},"completion_tokens_details":{"reasoning_tokens":0,"audio_tokens":0,"accepted_prediction_tokens":0,"rejected_prediction_tokens":0},"prompt_cost":0.0000024,"completion_cost":0.00046425,"total_cost":0.00046665}}]}}}
```

### Text Streaming Mode

In text streaming mode, selecting to include monitoring info (both cost and usage), will cause a `graphOutput` final stream event as shown:

#### Example

```json
data: ""

...

data: " This will help me assist you better!"

graphOutput: {
	"requestTokens": { "type": "number", "value": 16 },
	"responseTokens": { "type": "number", "value": 1093 },
	"cost": { "type": "number", "value": 0.00047865 },
	"usages": { "type": "any[]", "value": [
		{
			"type": "object",
			"value": {
				"prompt_tokens": 16,
				"completion_tokens": 635,
				"total_tokens": 651,
				"prompt_tokens_details": { "cached_tokens": 0, "audio_tokens": 0 },
				"completion_tokens_details": { "reasoning_tokens": 0, "audio_tokens": 0, "accepted_prediction_tokens": 0, "rejected_prediction_tokens": 0	},
				"prompt_cost": 0.0000024,
				"completion_cost": 0.00047625,
				"total_cost": 0.00047865
			}
		}
	]}
}
```
