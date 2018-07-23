import { format } from 'util';
import { randomBytes } from 'crypto';
import { writeFile, stat, mkdir } from 'mz/fs';
import * as path from 'path';
import * as yargs from 'yargs';
import * as rmrf from 'rmfr';
import { generate, Role } from './index';
import { publish as publishPackage } from './publish';

function mktemp(): string {
  return path.join('/tmp', `generated-${randomBytes(20).toString('hex')}`);
}

interface Args {
  pattern: string;
  output?: string;
  role?: Role;
  publish?: string;
  'publish-tag'?: string;
}

const argv = yargs
  .command('$0 <pattern>', 'launch code generator', (y) => y
    .positional('pattern',  {
      type: 'string',
      describe: 'Files matching this pattern will be evaluated as input',
    })
  )
  .option('output',  {
    type: 'string',
    alias: 'o',
    describe: 'Directory to output generated files',
  })
  .option('role',  {
    type: 'string',
    alias: 'r',
    default: Role.ALL,
    choices: Object.values(Role),
    describe: 'Generate specific role',
  })
  .option('publish',  {
    type: 'string',
    alias: 'p',
    describe: 'Publish as npm package with format of <packageName>@<version> (e.g. myservice@1.2.3)',
  })
  .option('publish-tag',  {
    type: 'string',
    alias: 't',
    describe: 'When `publish` is specified, publish to a specific tag (see `npm publish --tag`)',
  })
  .argv;

async function genCode(pattern: string, genPath: string, role?: Role) {
  const st = await stat(genPath);
  if (!st.isDirectory()) {
    throw new Error(`output dir: ${genPath} is not a directory`);
  }
  const schemaCode = await generate(pattern, role);
  await Promise.all(Object.entries(schemaCode).map(
    ([n, c]) => writeFile(path.join(genPath, n), c)
  ));
}

async function main({ pattern, output, role, publish, 'publish-tag': tag }: Args) {
  if (output) {
    await genCode(pattern, output, role);
  } else if (publish) {
    if (!role || role === Role.ALL) {
      throw new Error('Must specify `role` (client or server) option with `publish`');
    }
    const parts = publish.split('@');
    if (parts.length < 2) {
      throw new Error(`publish param should have a @ character for version, got ${publish}`);
    }
    const genPath = mktemp();
    await mkdir(genPath);
    try {
      await genCode(pattern, genPath, role);
      const name = parts.slice(0, -1).join('@');
      const version = parts[parts.length - 1];
      await publishPackage(genPath, role as Role.CLIENT | Role.SERVER, name, version, tag);
    } finally {
      await rmrf(genPath);
    }
  } else {
    throw new Error('Must specify one of `publish` or `output`');
  }
}

main(argv as any).catch((err) => {
  process.stderr.write(`Failed to generate files:\n${format(err)}\n`);
  process.exit(1);
});
