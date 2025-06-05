import { Hono, type Context, type Next } from 'hono';
import { serve as serveHono } from '@hono/node-server';
import type * as yargs from 'yargs';
import { readdir, stat } from 'node:fs/promises';
import * as path from 'path'
import { extname, isAbsolute, join } from 'node:path';
import didYouMean from 'didyoumean2';
import {
  createProcessor,
  loadProjectFromFile,
  type GraphId,
  type Outputs,
  type Project,
  type LooseDataValue,
  getSingleNodeStream,
} from '@alpic80/rivet-node';
import chalk from 'chalk';
import { configDotenv } from 'dotenv';
import * as Rivet from '@ironclad/rivet-node';
import { setupPlugins, logAvailablePluginsInfo } from './pluginConfiguration.js';
import { combinedLogger } from '../lib/logger.js';

type RivetType = {
	globalRivetNodeRegistry: {
		registerPlugin: (plugin: unknown) => void
	}
}

type StreamFlags = {
  start: string[]
  finish: string[]
  delta: string[]
}

export function makeCommand<T>(y: yargs.Argv<T>) {
  return y
    .option('hostname', {
      describe: 'The hostname to serve on',
      type: 'string',
      demandOption: false,
    })
    .option('port', {
      describe: 'The port to serve on',
      type: 'number',
      default: 3000,
    })
    .option('dev', {
      describe: 'Run in development mode: rereads the project file on each request',
      type: 'boolean',
      default: false,
    })
    .option('graph', {
      describe: 'The ID or name of the graph to run. If omitted, the main graph is used.',
      type: 'string',
      demandOption: false,
    })
    .option('allow-specifying-graph-id', {
      describe: 'Allow specifying the graph ID in the URL path',
      type: 'boolean',
      default: false,
    })
    .option('openai-api-key', {
      describe:
        'The OpenAI API key to use for the project. If omitted, the environment variable OPENAI_API_KEY is used.',
      type: 'string',
      demandOption: false,
    })
    .option('openai-endpoint', {
      describe:
        'The OpenAI API endpoint to use for the project. If omitted, the environment variable OPENAI_ENDPOINT is used.',
      type: 'string',
      demandOption: false,
    })
    .option('openai-organization', {
      describe:
        'The OpenAI organization to use for the project. If omitted, the environment variable OPENAI_ORGANIZATION is used.',
      type: 'string',
      demandOption: false,
    })
    .option('expose-cost', {
      describe: 'Expose the cost of the graph run in the response',
      type: 'boolean',
      default: false,
    })
    .option('expose-usage', {
      describe: 'Expose the token usage of the graph run in the response',
      type: 'boolean',
      default: false,
    })
    .option('stream', {  //support command delimited list and also [SFD] (start finish delta)
      describe:
        'Turns on streaming mode. Rivet events will be sent to the client using SSE (Server-Sent Events). If this is set to a Node ID or node title, only events for that node will be sent.',
      type: 'string',
      demandOption: false,
    })
    .option('stream-node', {
      describe: 'Streams the partial outputs of a specific node. Requires --stream to be set.',
      type: 'string',
      demandOption: false,
    })
    .option('log-requests', {
      describe: 'Determines if all requests (except health checks) will be logged via Hono logger',
      type: 'boolean',
      default: false,
    })
    .option('log-activity', {
      describe: 'Determines if basic activity should be logging during processing',
      type: 'boolean',
      default: false,
    })
    .option('log-trace', {
      describe: 'Determines if includeTrace should be turned on during graph processing',
      type: 'boolean',
      default: false,
    })
    .option('projects-root-dir', {
      describe: 'Specifies the root directory where project files are located. If specified, a projectFile argument will be a relative path to this directory',
      type: 'string',
      demandOption: false,
    })
    .positional('projectFile', {
      describe:
        'The project file to serve. If omitted, the project file in the current directory is used. There cannot be multiple project files in the current directory unless projects-root-dir is set.',
      type: 'string',
      demandOption: false,
    });
}

const conditionalLogger = () => {
  return async (c: Context, next: Next) => {
    if (c.req.path !== '/health') {
      await combinedLogger(c, next);
			return;
    }
    await next();
  }
}

type ServerContext = {
  hostname: string | undefined;
  port: number;
  projectFile: string | undefined;
  dev: boolean;
  graph: string | undefined;
  allowSpecifyingGraphId: boolean;
  openaiApiKey: string | undefined;
  openaiEndpoint: string | undefined;
  openaiOrganization: string | undefined;
  exposeCost: boolean;
	exposeUsage: boolean;
	logRequests: boolean;
	logActivity: boolean;
	logTrace: boolean;
  stream: string | undefined;
  streamNode: string | undefined;
	projectsRootDir: string | undefined;
	pluginSettings?: Record<string, Record<string, unknown>>;
}

type GraphCallOptions = ServerContext & {
  project: Project
  graphId?: GraphId
  inputText: string
}

type GraphExecOptions = GraphCallOptions & { inputs: Record<string, LooseDataValue> };

export async function serve(cliArgs: Partial<ServerContext> = {}) {
  try {
    configDotenv();
		debugger;
		const pluginSettings = await setupPlugins(Rivet as RivetType);

		const args: ServerContext = {
			hostname: cliArgs.hostname ?? process.env.HOSTNAME ?? '127.0.0.1',
			port: Number(cliArgs.port ?? process.env.PORT ?? 3000),
			projectFile: cliArgs.projectFile ?? process.env.PROJECT_FILE,
			dev: cliArgs.dev ?? process.env.NODE_ENV === 'development',
			graph: cliArgs.graph ?? process.env.GRAPH,
			allowSpecifyingGraphId: cliArgs.allowSpecifyingGraphId ?? process.env.ALLOW_SPECIFYING_GRAPH_ID === 'true',
			openaiApiKey: cliArgs.openaiApiKey ?? process.env.OPENAI_API_KEY,
			openaiEndpoint: cliArgs.openaiEndpoint ?? process.env.OPENAI_ENDPOINT,
			openaiOrganization: cliArgs.openaiOrganization ?? process.env.OPENAI_ORGANIZATION,
			exposeCost: cliArgs.exposeCost ?? process.env.EXPOSE_COST === 'true',
			exposeUsage: cliArgs.exposeUsage ?? process.env.EXPOSE_USAGE === 'true',
			logRequests: cliArgs.logRequests ?? process.env.LOG_REQUESTS === 'true',
			logActivity: cliArgs.logActivity ?? process.env.LOG_ACTIVITY === 'true',
			logTrace: cliArgs.logTrace ?? process.env.LOG_TRACE === 'true',
			stream: cliArgs.stream ?? process.env.STREAM,
			streamNode: cliArgs.streamNode ?? process.env.STREAM_NODE,
			projectsRootDir: cliArgs.projectsRootDir ?? process.env.PROJECTS_ROOT_DIR,
			pluginSettings: pluginSettings,
		}

		const processGraph = createProcessGraph(args);

    const app = new Hono();
		if (args.logRequests) {
			app.use('*', conditionalLogger());
		}

		let projectFilePath = '';
		let initialProject = null;

		if (args.projectsRootDir) {
			if (!(await validateProjectRootDirectory(args.projectsRootDir))) {
				throwIfNoRootDirectory(args.projectsRootDir);
			}
		}
		else {
			projectFilePath = await getProjectFile(args.projectFile);
			initialProject = await loadProjectFromFile(projectFilePath);

			throwIfNoMainGraph(initialProject, args.graph, projectFilePath);
			throwIfInvalidGraph(initialProject, args.graph);
		}

		if (args.logActivity) {
			const logInfo = [
				args.port && `Port:${chalk.bold.white(args.port)}`,
				args.projectFile && `ProjectFile:${chalk.bold.white(args.projectFile)}`,
				args.dev && `Dev:${chalk.bold.white(args.dev)}`,
				args.graph && `Graph:${chalk.bold.white(args.graph)}`,
				args.allowSpecifyingGraphId && `AllowSpecifyingGraphId:${chalk.bold.white(args.allowSpecifyingGraphId)}`,
				args.logRequests && `LogRequests:${chalk.bold.white(args.logRequests)}`
			].filter(Boolean).join(', ')

			console.log(chalk.green('Server config,', logInfo));
		}

		app.get('/health', async (c) => c.text('Healthy like Popeye'));

    app.post('/', async (c) => {
			if (args.projectsRootDir) {
				return c.text('Configured with projects-root-dir which requires a project file to be specified in URL', 400);
			}

      const project = args.dev ? await loadProjectFromFile(projectFilePath) : initialProject!;
      const inputText = await c.req.text();
			return await processGraph({ project, inputText });
    });

    if (args.allowSpecifyingGraphId || args.projectsRootDir) {
			app.post('/*', async (c) => {
				const full = decodeURIComponent(c.req.path.slice(1)) // remove leading slash
				const parts = full.split('/')

				let graphId: GraphId | undefined
				let graphFile: string | undefined

				if (parts.length === 1) {
					const single = parts[0]!;  //force TS to realize that there is content
					if (single.endsWith('.rivet-project')) {
						graphFile = single;
					} else {
						graphId = single as GraphId;
					}
				} else {
					graphId = parts.pop() as GraphId;
					graphFile = parts.join('/');
				}

        let project;
				if (args.projectsRootDir) {
					if (!graphFile) {
						return c.text('A graphFile is required when specifying projects-root-dir', 400);
					}

					const fileMissing = await testIfMissingFile(path.join(args.projectsRootDir, graphFile));
					if (fileMissing) {
						return c.text(`GraphFile ${graphFile} not found in root directory (${args.projectsRootDir})`, 400);
					}
					project = await loadProjectFromFile(path.join(args.projectsRootDir, graphFile));
				} else {
					project = args.dev || args.projectsRootDir ? await loadProjectFromFile(projectFilePath) : initialProject!;
				}

				const inputText = await c.req.text();
				return await processGraph({ project, inputText, graphId });
      });
    }

    const server = serveHono({
      port: args.port,
			hostname: args.hostname,
      fetch: app.fetch,
    });

		if (args.projectsRootDir) {
			console.log(
				chalk.green(`Serving specified project files from ${chalk.bold.white(args.projectsRootDir)} on port ${chalk.bold.white(args.port)}.`),
			);
		}
		else if (initialProject) {
			let servedGraphName: string;
			if (args.graph) {
				const graph = Object.values(initialProject.graphs).find(
					(g) => g.metadata!.id === args.graph || g.metadata!.name === args.graph,
				);
				servedGraphName = graph!.metadata!.name!;
			} else {
				const graph = Object.values(initialProject.graphs).find(
					(g) => g.metadata!.id === initialProject.metadata.mainGraphId,
				);
				servedGraphName = graph!.metadata!.name!;
			}

			console.log(
				chalk.green(`Serving project file ${chalk.bold.white(projectFilePath)} on port ${chalk.bold.white(args.port)}.\nServing graph "${chalk.bold.white(servedGraphName)}".`)
			);
		}
		else {
			console.log(chalk.red(`Misconfiguration, not serving from directory and have no initialProject`));
		}

		logAvailablePluginsInfo();

    function shutdown() {
      console.log('Shutting down...');

      server.close((err) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }

        process.exit(0);
      });
    }

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error(chalk.red(err));
    process.exit(1);
  }
}

function createProcessGraph(ctx: ServerContext) {
  return async (opts: {
    project: Project
    graphId?: GraphId
    inputText: string
  }): Promise<Response> => {
		let localCtx = { ...ctx }
		let inputs: Record<string, LooseDataValue> = {};
		let runParams: Record<string, LooseDataValue> = {};

  	if (opts.inputText.trim()) {
    	const parsed = JSON.parse(opts.inputText);

    	if (typeof parsed !== 'object') {
      	throw new Error('Inputs must be an object');
    	}

			if ('runParams' in parsed) {
    		runParams = parsed['runParams'] as Record<string, LooseDataValue>;
    		delete parsed['runParams'];
				localCtx = {
 					...localCtx,
  				...runParams
				}
			}
  		inputs = parsed;
  	}

		if (localCtx.logActivity) {
			const logInfo = [
				`Input:${JSON.stringify(inputs)}`,
				localCtx.stream && `Stream:${chalk.bold.white(localCtx.stream)}`,
				localCtx.streamNode && `StreamNode:${chalk.bold.white(localCtx.streamNode)}`,
				localCtx.exposeCost && `ExposeCost:${chalk.bold.white(localCtx.exposeCost)}`,
				localCtx.exposeUsage && `ExposeUsage:${chalk.bold.white(localCtx.exposeUsage)}`,
				localCtx.logTrace && `LogTrace:${chalk.bold.white(localCtx.logTrace)}`
			].filter(Boolean).join(', ')

			console.log(chalk.green('Processing request,', logInfo));
		}

		const execOpts: GraphExecOptions = {
			...localCtx,
			...opts,
			inputs
		}

  	if (localCtx.stream != null) {
			const stream = await streamGraph(execOpts as Parameters<typeof streamGraph>[0]);

			return new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive'
				}
			})
		}

	  const outputs = await runGraph(execOpts as Parameters<typeof runGraph>[0])

  	return new Response(JSON.stringify(outputs), {
    	headers: {
      	'Content-Type': 'application/json'
    	}
  	})
	}
}

const parseStream = (stream: string): StreamFlags | true => {
  if (!stream.trim())
    return true;

  const start: string[] = [];
  const finish: string[] = [];
  const delta: string[] = [];
	const pattern = /^([^[\]]+)(\[([SFD]+)\])?/;
  for (const raw of stream.split(',')) {
    const match = pattern.exec(raw);
    if (!match)
      continue;

    const name = match[1]?.trim();
    const flags = match[2];

    if (!name)
      continue;

    if (!flags || flags.includes('S'))
      start.push(name);
    if (!flags || flags.includes('F'))
      finish.push(name);
    if (!flags || flags.includes('D'))
      delta.push(name);
  }

  return { start, finish, delta };
}

async function streamGraph({
  project,
  inputs,
  graphId,
	pluginSettings,
  openaiApiKey,
  openaiEndpoint,
  openaiOrganization,
	exposeCost,
	exposeUsage,
	logActivity,
	logTrace,
  stream,
  streamNode,
}: {
  project: Project;
  inputs: Record<string, LooseDataValue>;
  graphId: GraphId | undefined;
	pluginSettings?: Record<string, Record<string, unknown>>;
  openaiApiKey: string | undefined;
  openaiEndpoint: string | undefined;
  openaiOrganization: string | undefined;
  exposeCost: boolean;
  exposeUsage: boolean;
	logActivity: boolean;
	logTrace: boolean;
  stream: string | undefined;
  streamNode: string | undefined;
}): Promise<ReadableStream> {
  const { run, processor, getSSEStream } = createProcessor(project, {
    inputs,
    graph: graphId,
		pluginSettings,
    openAiKey: openaiApiKey,
    openAiEndpoint: openaiEndpoint,
    openAiOrganization: openaiOrganization,
		includeTrace: logTrace
  });

  if (streamNode) {
    let sseStream;
		if (exposeCost || exposeUsage) {
			const baseOptions = {
				exposeCost,
				exposeUsage,
				done: exposeCost || exposeUsage,
				removeFinalOutput: exposeCost || exposeUsage,
				error: logActivity
			};
			const spec = {
				...baseOptions,
				partialOutputs: [streamNode],
				nodeFinish: [streamNode],
			};
		 sseStream = getSingleNodeStream(processor, spec);
		}
		else {
		 sseStream = getSingleNodeStream(processor, streamNode);
		}

    run().catch((err) => {
      console.error(err);
    });

    return sseStream;
  } else {
		const parsed = parseStream(stream!);
		const baseOptions = {
			exposeCost,
			exposeUsage,
			done: exposeCost || exposeUsage,
			removeFinalOutput: exposeCost || exposeUsage,
			error: logActivity
		};
		const sseStream = getSSEStream(
			parsed === true
				? { ...baseOptions, nodeStart: true, nodeFinish: true, partialOutputs: true }
				: {
						...baseOptions,
						nodeStart: parsed.start,
						nodeFinish: parsed.finish,
						partialOutputs: parsed.delta
					}
		);

    run().catch((err) => {
      console.error(err);
    });

    return sseStream;
  }
}

async function runGraph({
  project,
  inputs,
  graphId,
	pluginSettings,
  openaiApiKey,
  openaiEndpoint,
  openaiOrganization,
  exposeCost,
  exposeUsage,
	logTrace
}: {
  project: Project;
  inputs: Record<string, LooseDataValue>;
  graphId: GraphId | undefined;
  pluginSettings?: Record<string, Record<string, unknown>>;
	openaiApiKey: string | undefined;
  openaiEndpoint: string | undefined;
  openaiOrganization: string | undefined;
  exposeCost: boolean;
  exposeUsage: boolean;
	logTrace: boolean;
}): Promise<Outputs> {
  const { run } = createProcessor(project, {
    inputs,
    graph: graphId,
		pluginSettings,
    openAiKey: openaiApiKey,
    openAiEndpoint: openaiEndpoint,
    openAiOrganization: openaiOrganization,
		includeTrace: logTrace
  });

  const outputs = await run();

  if (!exposeCost) {
    delete outputs.cost;
  }
  if (!exposeUsage) {
    delete outputs.usage;
		delete outputs.requestTokens;
		delete outputs.responseTokens;
  }

  return outputs;
}

function throwIfNoMainGraph(project: Project, graph: string | undefined, projectFilePath: string) {
  if (!project.metadata.mainGraphId && !graph) {
    const validGraphs = Object.values(project.graphs).map((graph) => [graph.metadata!.id!, graph.metadata!.name!]);

    if (validGraphs.length === 0) {
      throw new Error('No graphs found in the project file. Please edit the project file in Rivet and add a graph.');
    }

    const validGraphNames = validGraphs.map(([id, name]) => `• "${name}" (${id})`);

    const firstExample = `rivet serve ${projectFilePath} --graph ${validGraphs[0]![0]!}`;
    const secondExample = `rivet serve ${projectFilePath} --graph "${validGraphs[0]![1]!}"`;

    throw new Error(
      `No graph name provided, and project does not specify a main graph. Valid graphs are: \n\n${validGraphNames.join(
        '\n',
      )}\n\n Use either the graph's name or its ID. For example, \n• \`${chalk.bold(firstExample)}\` or\n• \`${chalk.bold(secondExample)}\``,
    );
  }
}

function throwIfInvalidGraph(project: Project, graph: string | undefined) {
  if (project.metadata.mainGraphId && !graph) {
    return;
  }

  const matchingGraph = Object.values(project.graphs).find(
    (g) => g.metadata!.id === graph || g.metadata!.name === graph,
  );

  if (!matchingGraph) {
    const validGraphsAndIds = Object.values(project.graphs).flatMap((graph) => [
      graph.metadata!.id!,
      graph.metadata!.name!,
    ]);
    const suggestion = didYouMean(graph!, validGraphsAndIds);

    if (suggestion) {
      throw new Error(
        `Graph "${graph}" not found in project file. Did you mean \`${chalk.bold(`--graph "${suggestion}"`)}\`?`,
      );
    } else {
      const validGraphsAndIds = Object.values(project.graphs)
        .map((graph) => `• "${graph.metadata!.name}" (${graph.metadata!.id})`)
        .join('\n');

      throw new Error(`Graph "${graph}" not found in project file. Valid graphs are: \n${validGraphsAndIds}`);
    }
  }
}

async function getProjectFile(initialProjectFilePath: string | undefined): Promise<string> {
  let projectFilePath = initialProjectFilePath ?? (await getProjectFilePathFromDirectory(process.cwd()));

  await throwIfMissingFile(projectFilePath);

  if ((await stat(projectFilePath)).isDirectory()) {
    projectFilePath = await getProjectFilePathFromDirectory(projectFilePath);
  }

  return projectFilePath;
}

async function getProjectFilePathFromDirectory(directory: string): Promise<string> {
  const files = await readdir(directory);
  const projectFiles = files.filter((file) => extname(file) === '.rivet-project');

  if (projectFiles.length === 0) {
    throw new Error('No project file found in the current directory. Project files should end with .rivet-project.');
  }

  if (projectFiles.length > 1) {
    throw new Error(
      `Multiple project files found in the current directory. Please specify which one to serve: \n${projectFiles.join('\n')}`,
    );
  }

  return join(directory, projectFiles[0]!);
}

function throwIfNoRootDirectory(directory: string | undefined) {
  throw new Error(`No root directory found at: ${directory}`);
}

async function throwIfMissingFile(filePath: string) {
	const errorMsg = await testIfMissingFile(filePath);
	if (errorMsg) {
		throw new Error(errorMsg);
	}
}

async function testIfMissingFile(filePath: string): Promise<string | undefined> {
  try {
    await stat(filePath);
		return;
  } catch (err) {
    if ((err as any).code !== 'ENOENT') {
			return err instanceof Error ? err.message : String(err)
    }

    if (isAbsolute(filePath)) {
      const parentDir = filePath.split('/').slice(0, -1).join('/');
      const possibleFiles = await readdir(parentDir);
      const suggestion = didYouMean(filePath, possibleFiles);

      if (suggestion) {
        return `Could not find project file "${filePath}". Did you mean "${suggestion}"?`;
      } else {
        return `Could not find project file "${filePath}".`;
      }
    } else {
      const possibleFiles = await readdir(process.cwd());
      const suggestion = didYouMean(filePath, possibleFiles);

      if (suggestion) {
        return `Could not find project file "${filePath}". Did you mean "${suggestion}"?`;
      } else {
        return `Could not find project file "${filePath}".`;
      }
    }
  }
}

async function validateProjectRootDirectory(directory: string | undefined): Promise<boolean> {
	if (!directory) {
		return false;
	}

  await throwIfMissingFile(directory);
  return (await stat(directory)).isDirectory();
}
