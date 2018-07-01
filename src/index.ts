import { readFile, readdir } from 'mz/fs';
import { zip, fromPairs } from 'lodash';
import * as glob from 'glob';
import * as ts from 'typescript';
import * as tjs from 'typescript-json-schema';
import * as mustache from 'mustache';
import { promisify } from 'util';
import * as path from 'path';
import { transform } from './transform';

const tmplPath = (name) => path.join(__dirname, '..', 'templates', 'ts', name);
const libPath = path.join(__dirname, '..', 'src', 'lib');
const names = ['interfaces', 'client', 'server'];

interface GeneratedCode {
  interfaces: string;
  client: string;
  server: string;
  [name: string]: string;
}

async function getLib(): Promise<string[]> {
  const files = await readdir(libPath);
  return files.filter((f) => !f.startsWith('test'));
}

export async function generate(filePattern: string): Promise<GeneratedCode> {
  const paths = await promisify(glob)(filePattern);
  const settings: tjs.PartialArgs = {
    required: true,
    noExtraProps: true,
    propOrder: true,
  };

  const compilerOptions: tjs.CompilerOptions = {
    strictNullChecks: true,
    target: ts.ScriptTarget.ESNext,
    noEmit: true,
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    module: ts.ModuleKind.CommonJS,
    allowUnusedLabels: true,
  };

  const libFiles = await getLib();
  const libContents = await Promise.all(libFiles.map((n) => readFile(path.join(libPath, n), 'utf-8')));

  const program = ts.createProgram(paths, compilerOptions);
  const generator = tjs.buildGenerator(program, settings, paths)!;
  const schema = tjs.generateSchema(program, '*', settings, paths);
  const spec = transform(schema);
  const genFiles = names.map((n) => `${n}.ts`);
  const templates = await Promise.all(genFiles.map((n) => readFile(tmplPath(n), 'utf-8')));
  const rendered = templates.map((t) => mustache.render(t, spec));
  return {
    clientDeps: ['lodash', 'ajv', 'request-promise-native', 'request', ''].join('\n'),
    serverDeps: ['lodash', 'ajv', 'koa', 'koa-router', 'koa-json-error', 'koa-bodyparser', ''].join('\n'),
    ...fromPairs(
      zip([...libFiles, ...genFiles], [...libContents, ...rendered])
    ) as GeneratedCode,
  };
}
