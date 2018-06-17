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
  public readonly main: string;
  constructor(
    public readonly schema: string,
    public readonly handler: string,
    public readonly test: string,
    public readonly dir = mktemp()
  ) {
    this.main = `
import { AddressInfo } from 'net';
import { TestServer, TestClient } from './rpc';
import Handler from './handler';
import test from './test';

async function main() {
  const h = new Handler();

  const server = new TestServer(h);
  const listener = await server.listen(0, '127.0.0.1');
  const { address, port } = (listener.address() as AddressInfo);
  const client = new TestClient('http://' + address + ':' + port);
  await test(client);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;
  }

  public async setup() {
    await mkdir(this.dir);
    const schemaPath = path.join(this.dir, 'schema.ts');
    await writeFile(schemaPath, this.schema);
    const schemaCode = await generate(schemaPath);
    await writeFile(path.join(this.dir, 'rpc.ts'), schemaCode);
    await writeFile(path.join(this.dir, 'main.ts'), this.main);
    await writeFile(path.join(this.dir, 'handler.ts'), this.handler);
    await writeFile(path.join(this.dir, 'test.ts'), `
import { expect } from 'chai';
${this.test}`);
  }

  public async cleanup() {
    await promisify(rmrf)(this.dir);
  }

  public async exec(): Promise<{ stdout: string, stderr: string }> {
    const testPath = path.join(this.dir, 'main.ts');
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
      // await this.cleanup();
    }
  }
}

describe('generate', () => {
  it('creates valid TS client / server code', async () => {
    const schema = `
export interface Test {
  bar: {
    params: {
      a: number;
    };
    returns: string;
  };
}`;
    const handler = `
export default class Handler {
  public async bar(a: number): Promise<string> {
    return a.toString();
  }
}
`;
    const test = `
import { TestClient } from './rpc';

export default async function test(client: TestClient) {
 expect(await client.bar(3)).to.equal('3');
}
`;
    await new TestCase(schema, handler, test).run();
  });

  it('works with $reffed schemas', async () => {
    const schema = `
export interface User {
  name: string;
}

export interface Test {
  authenticate: {
    params: {
      token: string;
    };
    returns: User;
  };
}`;
    const handler = `
import { User } from './rpc';

export default class Handler {
  public async authenticate(token: string): Promise<User> {
    return { name: 'Vova' };
  }
}
`;
    const test = `
import { TestClient } from './rpc';

export default async function test(client: TestClient) {
 expect(await client.authenticate('token')).to.eql({ name: 'Vova' });
}
`;
    await new TestCase(schema, handler, test).run();
  });

  it('coerces Date in param and return', async () => {
    const schema = `
export interface Test {
  dateIncrement: {
    params: {
      d: Date;
    };
    returns: Date;
  };
}`;
    const handler = `
export default class Handler {
  public async dateIncrement(d: Date): Promise<Date> {
    return new Date(d.getTime() + 1);
  }
}
`;
    const test = `
import { TestClient } from './rpc';

export default async function test(client: TestClient) {
 const d = new Date();
 expect(await client.dateIncrement(d)).to.eql(new Date(d.getTime() + 1));
}
`;
    await new TestCase(schema, handler, test).run();
  });
});
