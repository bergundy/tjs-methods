import { expect } from 'chai';
import 'mocha';
import { tmpdir } from 'os';
import { promisify } from 'util';
import * as path from 'path';
import { randomBytes } from 'crypto';
import * as rmrf from 'rimraf';
import { writeFile, unlink, mkdir } from 'mz/fs';
import { exec } from 'mz/child_process';
import { generate } from './index';

function mktemp(): string {
  return path.join(__dirname, '..', 'tmpTestCases', `test-${randomBytes(20).toString('hex')}`);
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

class TestCase {
  constructor(
    public readonly schema: string,
    public readonly code: string,
    public readonly dir = mktemp()
  ) {
  }

  public async setup() {
    await mkdir(this.dir);
    const schemaPath = path.join(this.dir, 'schema.ts');
    await writeFile(schemaPath, this.schema);
    const schemaCode = await generate(schemaPath);
    await writeFile(path.join(this.dir, 'rpc.ts'), schemaCode);
    await writeFile(path.join(this.dir, 'code.ts'), this.code);
  }

  public async cleanup() {
    await promisify(rmrf)(this.dir);
  }

  public async exec(): Promise<{ stdout: string, stderr: string }> {
    const testPath = path.join(this.dir, 'code.ts');
    const [stdout, stderr] = await exec(`ts-node ${testPath}`);
    return { stdout: stdout.toString(), stderr: stderr.toString() };
  }

  public async run(): Promise<{ stdout: string, stderr: string }> {
    try {
      await this.setup();
      return await this.exec();
    // } catch (err) {
    //   console.error(err);
    //   throw err;
    } finally {
      await this.cleanup();
    }
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
    const code = `
import { AddressInfo } from 'net';
import { FooServer, FooClient } from './rpc';

class Handler {
  async bar(a: number): Promise<string> {
    return a.toString();
  }
}

async function main() {
  const h = new Handler();

  const server = new FooServer(h);
  const listener = await server.listen(0, '127.0.0.1');
  const { address, port } = (listener.address() as AddressInfo);
  const client = new FooClient('http://' + address + ':' + port);
  const result = await client.bar(3);
  console.log(JSON.stringify(result));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;
    const { stdout } = await new TestCase(schema, code).run();
    const result = JSON.parse(stdout);
    expect(result).to.equal('3');
  });
});
