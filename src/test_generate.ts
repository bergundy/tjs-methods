import { expect } from 'chai';
import 'mocha';
import { promisify } from 'util';
import * as path from 'path';
import { randomBytes } from 'crypto';
import * as rmrf from 'rimraf';
import { writeFile, mkdir } from 'mz/fs';
import { GeneratedCode, Role } from './types';
import { generate } from './index';

function mktemp(): string {
  return path.join(__dirname, '..', 'tmpTestCases', `test-${randomBytes(20).toString('hex')}`);
}

class TestCase {
  constructor(
    public readonly schema: string,
    public readonly dir = mktemp()
  ) {
  }

  public async cleanup() {
    await promisify(rmrf)(this.dir);
  }

  public async generate(role: Role): Promise<GeneratedCode> {
    await mkdir(this.dir);
    const schemaPath = path.join(this.dir, 'schema.ts');
    await writeFile(schemaPath, this.schema);
    return await generate(schemaPath, role);
  }
}

describe('generate', () => {
  it('generates only client code when requested', async () => {
    const { code, pkg } = await new TestCase(`
export interface Test {
  bar: {
    params: {
      a: number;
    };
    returns: string;
  };
}`
    ).generate(Role.CLIENT);
    expect(Object.keys(code).sort()).to.eql([
      'client.ts',
      'common.ts',
      'interfaces.ts',
      'koaMW.ts',
    ]);

    expect(pkg.dependencies.koa).to.be.a('undefined');
    expect(pkg.dependencies.request).to.be.a('string');
  });

  it('generates only server code when requested', async () => {
    const { code, pkg } = await new TestCase(`
export interface Test {
  bar: {
    params: {
      a: number;
    };
    returns: string;
  };
}`
    ).generate(Role.SERVER);
    expect(Object.keys(code).sort()).to.eql([
      'common.ts',
      'interfaces.ts',
      'koaMW.ts',
      'server.ts',
    ]);

    expect(pkg.dependencies.koa).to.be.a('string');
    expect(pkg.dependencies.request).to.be.a('undefined');
  });

  it('respects optional params', async () => {
    const iface = `
export interface A {
  readonly optional?: number;
  readonly required: number;
}`;
    const { code } = await new TestCase(iface).generate(Role.SERVER);
    expect(code['interfaces.ts']).to.contain(iface.trim());
  });

  it('respects optional attributes in return value', async () => {
    const iface = `
export interface A {
  foo: {
    params: {
    };
    returns: {
      a?: number;
    };
  };
}`;
    const { code } = await new TestCase(iface).generate(Role.SERVER);
    expect(code['interfaces.ts']).to.contain('foo(): Promise<{ a?: number; }>');
  });

  it('generates declarations of root level union types', async () => {
    const iface = 'export type A = { a: number; } | { b: number; };';
    const { code } = await new TestCase(iface).generate(Role.SERVER);
    expect(code['interfaces.ts']).to.contain(iface);
  });

  it('generates declarations of root level enums', async () => {
    const iface = `
export enum A {
  A = 'a',
  B = 'b',
  C_1 = 'c-1',
}`;
    const { code } = await new TestCase(iface).generate(Role.SERVER);
    expect(code['interfaces.ts']).to.contain(iface.trim());
  });
});
