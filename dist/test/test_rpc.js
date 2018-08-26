"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
require("chai-as-promised");
const path = require("path");
const crypto_1 = require("crypto");
const rmrf = require("rmfr");
const fs_1 = require("mz/fs");
const child_process_1 = require("mz/child_process");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
function mktemp() {
    return path.join(__dirname, '..', 'tmpTestCases', `test-${crypto_1.randomBytes(20).toString('hex')}`);
}
class TestCase {
    constructor(schema, handler, tester, mw, main, dir = mktemp()) {
        this.schema = schema;
        this.handler = handler;
        this.tester = tester;
        this.mw = mw;
        this.dir = dir;
        this.main = main || `
import { AddressInfo } from 'net';
import { TestServer } from './server';
import { TestClient } from './client';
import Handler from './handler';
${this.mw ? "import mw from './mw';" : ''}
import test from './test';

async function main() {
  const h = new Handler();

  const server = new TestServer(h, true${this.mw ? ', [mw]' : ''});
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
    async setup() {
        await fs_1.mkdir(this.dir);
        await fs_1.mkdir(path.join(this.dir, 'src'));
        const schemaPath = path.join(this.dir, 'schema.ts');
        await fs_1.writeFile(schemaPath, this.schema);
        await fs_1.writeFile(path.join(this.dir, 'src', 'main.ts'), this.main);
        if (this.mw) {
            await fs_1.writeFile(path.join(this.dir, 'src', 'mw.ts'), this.mw);
        }
        await fs_1.writeFile(path.join(this.dir, 'src', 'handler.ts'), this.handler);
        await fs_1.writeFile(path.join(this.dir, 'src', 'test.ts'), `
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);
${this.tester}`);
        await utils_1.spawn('node', [
            path.join(__dirname, '..', 'cli.js'),
            'test@0.0.1',
            'schema.ts',
            '-o',
            '.',
        ], {
            cwd: this.dir,
            stdio: 'inherit',
        });
    }
    async cleanup() {
        await rmrf(this.dir);
    }
    async exec() {
        const testPath = path.join(this.dir, 'main.js');
        const [stdout, stderr] = await child_process_1.exec(`node ${testPath}`);
        return { stdout: stdout.toString(), stderr: stderr.toString() };
    }
    async run() {
        try {
            await this.setup();
            return await this.exec();
            // } catch (err) {
            //   console.error(err);
            //   throw err;
        }
        finally {
            // await this.cleanup();
        }
    }
}
ava_1.default('rpc creates valid TS client / server code', utils_2.pass, async () => {
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
    const tester = `
import { TestClient } from './client';

export default async function test(client: TestClient) {
 expect(await client.bar(3)).to.equal('3');
}
`;
    await new TestCase(schema, handler, tester).run();
});
ava_1.default('supports optional parameters', utils_2.pass, async () => {
    const schema = `
export interface Test {
  bar: {
    params: {
      b: string;
      a: number;
      c?: string;
      d?: string;
    };
    returns: string;
  };
}`;
    const handler = `
export default class Handler {
  public async bar(b: string, a: number, c?: string, d?: string): Promise<string> {
    return d ? \`\${d} \${b} \${a}\` : \`\${a}\`;
  }
}
`;
    const tester = `
import { TestClient } from './client';
export default async function test(client: TestClient) {
 expect(await client.bar('hello', 3, undefined, 'x')).to.equal('x hello 3');
 expect(await client.bar('hello', 3, undefined, undefined)).to.equal('3');
}
`;
    await new TestCase(schema, handler, tester).run();
});
ava_1.default('rpc supports the void return type', utils_2.pass, async () => {
    const schema = `
export interface Test {
  bar: {
    params: {
      a: string;
    };
    returns: null;
  };
}`;
    const handler = `
export default class Handler {
  public async bar(a: string): Promise<void> {
  }
}
`;
    const tester = `
import { TestClient } from './client';

export default async function test(client: TestClient) {
 expect(await client.bar('heh')).to.be.undefined;
}
`;
    await new TestCase(schema, handler, tester).run();
});
ava_1.default('rpc supports empty params', utils_2.pass, async () => {
    const schema = `
export interface Test {
  bar: {
    params: {
    };
    returns: string;
  };
}`;
    const handler = `
export default class Handler {
  public async bar(): Promise<string> {
    return 'heh';
  }
}
`;
    const tester = `
import { TestClient } from './client';

export default async function test(client: TestClient) {
 expect(await client.bar()).to.be.eql('heh');
}
`;
    await new TestCase(schema, handler, tester).run();
});
ava_1.default('rpc works with $reffed schemas', utils_2.pass, async () => {
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
import { User } from './interfaces';

export default class Handler {
  public async authenticate(token: string): Promise<User> {
    return { name: 'Vova' };
  }
}
`;
    const tester = `
import { TestClient } from './client';

export default async function test(client: TestClient) {
 expect(await client.authenticate('token')).to.eql({ name: 'Vova' });
}
`;
    await new TestCase(schema, handler, tester).run();
});
ava_1.default('rpc coerces Date in param and return', utils_2.pass, async () => {
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
    const tester = `
import { TestClient } from './client';

export default async function test(client: TestClient) {
  const d = new Date();
  expect(await client.dateIncrement(d)).to.eql(new Date(d.getTime() + 1));
}
`;
    await new TestCase(schema, handler, tester).run();
});
ava_1.default('rpc constructs Error classes from and only from declared errors', utils_2.pass, async () => {
    const schema = `
export class RuntimeError extends Error {}

export interface Test {
raise: {
  params: {
    exc: string;
  };
  returns: null;
  throws: RuntimeError;
};
}`;
    const handler = `
import { RuntimeError } from './interfaces';

export default class Handler {
public async raise(exc: string): Promise<void> {
  if (exc === 'RuntimeError') {
    throw new RuntimeError('heh');
  }
  throw new Error('ho');
}
}
`;
    const tester = `
import { RuntimeError, InternalServerError } from './interfaces';
import { TestClient } from './client';

export default async function test(client: TestClient) {
await expect(client.raise('RuntimeError')).to.eventually.be.rejectedWith(RuntimeError, 'heh');
await expect(client.raise('UnknownError')).to.eventually.be.rejectedWith(InternalServerError);
}
`;
    await new TestCase(schema, handler, tester).run();
});
ava_1.default('rpc constructs Error classes from and only from declared errors when multiple errors possible', utils_2.pass, async () => {
    const schema = `
export class RuntimeError extends Error {}
export class WalktimeError extends Error {}

export interface Test {
raise: {
  params: {
    exc: string;
  };
  returns: null;
  throws: RuntimeError | WalktimeError;
};
}`;
    const handler = `
import { RuntimeError, WalktimeError } from './interfaces';

export default class Handler {
public async raise(exc: string): Promise<void> {
  if (exc === 'RuntimeError') {
    throw new RuntimeError('heh');
  }
  if (exc === 'WalktimeError') {
    throw new WalktimeError('hoh');
  }
  throw new Error('ho');
}
}
`;
    const tester = `
import { RuntimeError, WalktimeError, InternalServerError } from './interfaces';
import { TestClient } from './client';

export default async function test(client: TestClient) {
await expect(client.raise('RuntimeError')).to.eventually.be.rejectedWith(RuntimeError, 'heh');
await expect(client.raise('WalktimeError')).to.eventually.be.rejectedWith(WalktimeError, 'hoh');
await expect(client.raise('UnknownError')).to.eventually.be.rejectedWith(InternalServerError);
}
`;
    await new TestCase(schema, handler, tester).run();
});
ava_1.default('rpc supports the ServerOnlyContext interface', utils_2.pass, async () => {
    const schema = `
export interface ServerOnlyContext {
ip: string;
}

export interface Test {
hello: {
  params: {
    name: string;
  };
  returns: string;
};
}`;
    const handler = `
import * as koa from 'koa';
import { Context } from './server';

export default class Handler {
public async extractContext(_: koa.Context): Promise<Context> {
  return { ip: 'test' };
}

public async hello({ ip }: Context, name: string): Promise<string> {
  return 'Hello, ' + name + ' from ' + ip;
}
}
`;
    const tester = `
import { TestClient } from './client';

export default async function test(client: TestClient) {
const result = await client.hello('vova');
expect(result).to.equal('Hello, vova from test');
}
`;
    await new TestCase(schema, handler, tester).run();
});
ava_1.default('rpc supports the ClientContext interface', utils_2.pass, async () => {
    const schema = `
export interface ClientContext {
debugId: string;
}

export interface Test {
hello: {
  params: {
    name: string;
  };
  returns: string;
};
}`;
    const handler = `
import * as koa from 'koa';
import { Context } from './server';

export default class Handler {
public async hello({ debugId }: Context, name: string): Promise<string> {
  return 'Hello, ' + name + ' d ' + debugId;
}
}
`;
    const tester = `
import { TestClient, Context } from './client';

export default async function test(client: TestClient) {
const result = await client.hello({ debugId: '666' } as Context, 'vova');
expect(result).to.equal('Hello, vova d 666');
}
`;
    await new TestCase(schema, handler, tester).run();
});
ava_1.default('rpc supports the combination of ClientContext and ServerOnlyContext', utils_2.pass, async () => {
    const schema = `
export interface ClientContext {
debugId: string;
}

export interface ServerOnlyContext {
ip: string;
}

export interface Test {
hello: {
  params: {
    name: string;
  };
  returns: string;
};
}`;
    const handler = `
import * as koa from 'koa';
import { Context, ServerOnlyContext } from './server';

export default class Handler {
public async extractContext(_: koa.Context): Promise<ServerOnlyContext> {
  return { ip: 'test' };
}

public async hello({ debugId, ip }: Context, name: string): Promise<string> {
  return 'Hello, ' + name + ' d ' + debugId + ' from ' + ip;
}
}
`;
    const tester = `
import { TestClient, Context } from './client';

export default async function test(client: TestClient) {
const result = await client.hello({ debugId: '666' } as Context, 'vova');
expect(result).to.equal('Hello, vova d 666 from test');
}
`;
    await new TestCase(schema, handler, tester).run();
});
const dummySchema = `
export interface Test {
bar: {
  params: {
    /**
     * @minLength 1
     */
    a: string;
  };
  returns: string;
};
}`;
const dummyMain = `
import test from './test';

async function main() {
try {
  await test();
  process.exit(0);
} catch(err) {
  console.error(err);
  process.exit(1);
}
}

main();
  `;
ava_1.default('rpc forwards network errors', utils_2.pass, async () => {
    // TODO: potential race condition if port reopens by other process immediately after close
    const tester = `
import { TestClient } from './client';
import { AddressInfo } from 'net';
import * as http from 'http';

export default async function test() {
const server = http.createServer();
await new Promise((resolve, reject) => {
  server.listen(0, '127.0.0.1', resolve);
  server.once('error', reject);
});
const { address, port } = (server.address() as AddressInfo);
const client = new TestClient('http://' + address + ':' + port);
server.close();
await expect(client.bar('heh')).to.eventually.be.rejectedWith(/^Error: connect ECONNREFUSED/);
}
`;
    await new TestCase(dummySchema, '', tester, undefined, dummyMain).run();
});
ava_1.default('rpc handles empty 500 responses', utils_2.pass, async () => {
    const tester = `
import { TestClient } from './client';
import { StatusCodeError } from 'request-promise-native/errors';
import { AddressInfo } from 'net';
import * as http from 'http';

export default async function test() {
const server = http.createServer((req, res) => {
    res.statusCode = 500;
    res.statusMessage = 'sorry';
    res.end();
});
await new Promise((resolve, reject) => {
  server.listen(0, '127.0.0.1', resolve);
  server.once('error', reject);
});
const { address, port } = (server.address() as AddressInfo);
const client = new TestClient('http://' + address + ':' + port);
await expect(client.bar('heh')).to.eventually.be.rejectedWith(StatusCodeError, '500 - undefined');
}
`;
    await new TestCase(dummySchema, '', tester, undefined, dummyMain).run();
});
ava_1.default('rpc handles non-json 500 responses', utils_2.pass, async () => {
    const tester = `
import { TestClient } from './client';
import { StatusCodeError } from 'request-promise-native/errors';
import { AddressInfo } from 'net';
import * as http from 'http';

export default async function test() {
const server = http.createServer((req, res) => {
    res.statusCode = 500;
    res.statusMessage = 'Internal Server Error';
    res.end('Internal Server Error');
});
await new Promise((resolve, reject) => {
  server.listen(0, '127.0.0.1', resolve);
  server.once('error', reject);
});
const { address, port } = (server.address() as AddressInfo);
const client = new TestClient('http://' + address + ':' + port);
await expect(client.bar('heh')).to.eventually.be.rejectedWith(StatusCodeError, '500 - "Internal Server Error"');
}
`;
    await new TestCase(dummySchema, '', tester, undefined, dummyMain).run();
});
ava_1.default('rpc throws 400 errors on validation issues', utils_2.pass, async () => {
    const handler = `
export default class Handler {
public async bar(name: string): Promise<string> {
  return 'Hello, ' + name;
}
}
`;
    const tester = `
import { TestClient, ValidationError } from './client';

export default async function test(client: TestClient) {
await expect(client.bar('')).to.eventually.be.rejectedWith(ValidationError, 'Bad Request');
}
`;
    await new TestCase(dummySchema, handler, tester).run();
});
//# sourceMappingURL=test_rpc.js.map