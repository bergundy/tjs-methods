import { format } from 'util';
import { writeFile, stat } from 'mz/fs';
import * as path from 'path';
import * as yargs from 'yargs';
import { generate, Role } from './index';

interface Args {
  pattern: string;
  output: string;
  role: Role;
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
    demandOption: true,
    describe: 'Directory to output generated files',
  })
  .option('role',  {
    type: 'string',
    alias: 'r',
    default: Role.ALL,
    choices: Object.values(Role),
    describe: 'Generate specific role',
  })
  .argv;

async function main({ pattern, output, role }: Args) {
  try {
    const st = await stat(output);
    if (!st.isDirectory()) {
      throw new Error(`output dir: ${output} is not a directory`);
    }
    const schemaCode = await generate(pattern, role);
    await Promise.all(Object.entries(schemaCode).map(
      ([n, c]) => writeFile(path.join(output, n), c)
    ));
  } catch (err) {
    process.stderr.write(`Failed to generate files:\n${format(err)}\n`);
    process.exit(1);
  }
}

main(argv as any);
