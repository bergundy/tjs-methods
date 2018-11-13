"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
require("mocha");
const util_1 = require("util");
const path = require("path");
const crypto_1 = require("crypto");
const rmrf = require("rimraf");
const fs_1 = require("mz/fs");
const types_1 = require("./types");
const index_1 = require("./index");
function mktemp() {
    return path.join(__dirname, '..', 'tmpTestCases', `test-${crypto_1.randomBytes(20).toString('hex')}`);
}
class TestCase {
    constructor(schema, dir = mktemp()) {
        this.schema = schema;
        this.dir = dir;
    }
    async cleanup() {
        await util_1.promisify(rmrf)(this.dir);
    }
    async generate(role) {
        await fs_1.mkdir(this.dir);
        const schemaPath = path.join(this.dir, 'schema.ts');
        await fs_1.writeFile(schemaPath, this.schema);
        return await index_1.generate(schemaPath, role);
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
}`).generate(types_1.Role.CLIENT);
        chai_1.expect(Object.keys(code).sort()).to.eql([
            'client.ts',
            'common.ts',
            'interfaces.ts',
            'koaMW.ts',
        ]);
        chai_1.expect(pkg.dependencies.koa).to.be.a('undefined');
        chai_1.expect(pkg.dependencies.request).to.be.a('string');
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
}`).generate(types_1.Role.SERVER);
        chai_1.expect(Object.keys(code).sort()).to.eql([
            'common.ts',
            'interfaces.ts',
            'koaMW.ts',
            'server.ts',
        ]);
        chai_1.expect(pkg.dependencies.koa).to.be.a('string');
        chai_1.expect(pkg.dependencies.request).to.be.a('undefined');
    });
    it('respects optional params', async () => {
        const iface = `
export interface A {
  readonly optional?: number;
  readonly required: number;
}`;
        const { code } = await new TestCase(iface).generate(types_1.Role.SERVER);
        chai_1.expect(code['interfaces.ts']).to.contain(iface.trim());
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
        const { code } = await new TestCase(iface).generate(types_1.Role.SERVER);
        chai_1.expect(code['interfaces.ts']).to.contain('foo(): Promise<{ a?: number; }>');
    });
    it('generates declarations of root level union types', async () => {
        const iface = 'export type A = { a: number; } | { b: number; };';
        const { code } = await new TestCase(iface).generate(types_1.Role.SERVER);
        chai_1.expect(code['interfaces.ts']).to.contain(iface);
    });
    it('generates declarations of root level enums', async () => {
        const iface = `
export enum A {
  A = 'a',
  B = 'b',
  C_1 = 'c-1',
}`;
        const { code } = await new TestCase(iface).generate(types_1.Role.SERVER);
        chai_1.expect(code['interfaces.ts']).to.contain(iface.trim());
    });
});
//# sourceMappingURL=test_generate.js.map