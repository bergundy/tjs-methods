"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
require("mocha");
const util_1 = require("util");
const path = require("path");
const crypto_1 = require("crypto");
const rmrf = require("rimraf");
const fs_1 = require("mz/fs");
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
        const code = await new TestCase(`
export interface Test {
  bar: {
    params: {
      a: number;
    };
    returns: string;
  };
}`).generate(index_1.Role.CLIENT);
        chai_1.expect(Object.keys(code).sort()).to.eql([
            'client.ts',
            'clientDeps',
            'common.ts',
            'interfaces.ts',
            'koaMW.ts',
        ]);
    });
    it('generates only server code when requested', async () => {
        const code = await new TestCase(`
export interface Test {
  bar: {
    params: {
      a: number;
    };
    returns: string;
  };
}`).generate(index_1.Role.SERVER);
        chai_1.expect(Object.keys(code).sort()).to.eql([
            'common.ts',
            'interfaces.ts',
            'koaMW.ts',
            'server.ts',
            'serverDeps',
        ]);
    });
    it('respects optional params', async () => {
        const iface = `
export interface A {
  readonly optional?: number;
  readonly required: number;
}`;
        const code = await new TestCase(iface).generate(index_1.Role.SERVER);
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
        const code = await new TestCase(iface).generate(index_1.Role.SERVER);
        chai_1.expect(code['interfaces.ts']).to.contain('foo(): Promise<{ a?: number; }>');
    });
});
//# sourceMappingURL=test_generate.js.map