import { expect } from 'chai';
import 'mocha';
import { tmpdir } from 'os';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { generate } from './index';
import { writeFile, unlink } from 'mz/fs';
import { exec } from 'mz/child_process';

function mktemp(): string {
  return `${tmpdir()}/test-${randomBytes(20).toString('hex')}.ts`;
}

async function *writeTempFile(contents: string): AsyncIterableIterator<string> {
  const filename = mktemp();
  await writeFile(filename, contents);
  try {
    yield filename;
  } finally {
    await unlink(filename);
  }
}

describe('generate', () => {
  it('creates valid TS client / server code', async () => {
    const schema = `
export interface Foo {
    bar: {
          params: {
                  a: number;
                };
          returns: string;
        };
}`;
    for await (const schemaPath of writeTempFile(schema)) {
      const schemaCode = await generate(schemaPath);
      for await (const codePath of writeTempFile(schemaCode)) {
        const testCode = `
import { FooServer } from '${codePath.slice(0, -3)}';

class Handler {
  async bar(a: number): Promise<string> {
    return a.toString();
  }
}

const h = new Handler();

const server = new FooServer(h);
const listener = server.listen(0, '127.0.0.1');
console.log(listener.address());
`;
        for await (const testPath of writeTempFile(testCode)) {
          try {
            const [stdout, stderr] = await exec(`tsc ${testPath}`);
            console.log({ stdout, stderr });
          } catch (err) {
            console.error(err);
            throw err;
          }
        }
      }
    }
  });
});
