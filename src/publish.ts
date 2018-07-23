import * as path from 'path';
import { readFile, writeFile } from 'mz/fs';
import * as eventToPromise from 'event-to-promise';
import { spawn as origSpawn, SpawnOptions } from 'child_process';
import { Role } from './index';

const tsconfig = {
  version: '2.4.2',
  compilerOptions: {
    lib: ['es2017', 'esnext'],
    target: 'es2017',
    module: 'commonjs',
    moduleResolution: 'node',
    emitDecoratorMetadata: true,
    checkJs: false,
    allowJs: false,
    experimentalDecorators: true,
    downlevelIteration: true,
    sourceMap: true,
    declaration: true,
    strictNullChecks: true,
  },
  include: [
    '*.ts',
  ],
  exclude: [
    'node_modules',
  ],
};

const spawn = (command: string, args?: ReadonlyArray<string>, options?: SpawnOptions) =>
  eventToPromise(origSpawn(command, args, options), 'exit');

export async function publish(
  genPath: string, role: Role.CLIENT | Role.SERVER, name: string, version: string, tag?: string
): Promise<void> {
  const npm = (...args: string[]) => spawn('npm', args, { cwd: genPath, stdio: 'inherit' });

  await writeFile(path.join(genPath, 'tsconfig.json'), JSON.stringify(tsconfig));

  const depsStr = await readFile(path.join(genPath, `${role}Deps`), 'utf8');
  const dependencies = depsStr.split('\n').filter((s) => s !== '');
  const devDependencies = ['@types/node'];
  const pkg = {
    main: `${role}.js`,
    types: `${role}.d.ts`,
    name: `${name}-${role}`,
    version,
  };
  await writeFile(path.join(genPath, 'package.json'), JSON.stringify(pkg));
  await npm('i', ...dependencies);
  await npm('i', '-D', ...devDependencies);
  await spawn('tsc', [], { cwd: genPath, stdio: 'inherit' });
  if (tag) {
    await npm('publish', '--tag', tag);
  } else {
    await npm('publish');
  }
}
