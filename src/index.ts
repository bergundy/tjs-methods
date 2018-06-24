import { readFile } from 'mz/fs';
import * as glob from 'glob';
import * as tjs from 'typescript-json-schema';
import * as mustache from 'mustache';
import { promisify } from 'util';
import * as path from 'path';
import { transform } from './transform';

export async function generate(filePattern: string): Promise<string> {
  const paths = await promisify(glob)(filePattern);
  const settings: tjs.PartialArgs = {
    required: true,
    noExtraProps: true,
    propOrder: true,
  };

  const compilerOptions: tjs.CompilerOptions = {
    strictNullChecks: true,
  };

  const program = tjs.getProgramFromFiles(paths, compilerOptions);

  const schema = tjs.generateSchema(program, '*', settings);
  const spec = transform(schema);
  const template = await readFile(path.join(__dirname, '..', 'template.ts'), 'utf-8');
  return mustache.render(template, spec);
}
