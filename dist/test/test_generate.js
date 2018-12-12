"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const lodash_1 = require("lodash");
const glob = require("glob");
const chai_1 = require("chai");
const util_1 = require("util");
const path = require("path");
const crypto_1 = require("crypto");
const rmrf = require("rmfr");
const fs_1 = require("mz/fs");
const types_1 = require("../types");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
function mktemp() {
    return path.join(__dirname, '..', 'tmpTestCases', `test-${crypto_1.randomBytes(20).toString('hex')}`);
}
class TestCase {
    constructor(schema, dir = mktemp()) {
        this.schema = schema;
        this.dir = dir;
    }
    async cleanup() {
        await rmrf(this.dir);
    }
    async generate(role) {
        await fs_1.mkdir(this.dir);
        await fs_1.mkdir(path.join(this.dir, 'gen'));
        const schemaPath = path.join(this.dir, 'schema.ts');
        await fs_1.writeFile(schemaPath, this.schema);
        await utils_1.spawn('node', [
            path.join(__dirname, '..', 'cli.js'),
            'test@0.0.1',
            'schema.ts',
            '--nocompile',
            '-r',
            role,
            '-o',
            'gen',
        ], {
            cwd: this.dir,
            stdio: 'inherit',
        });
        const paths = await util_1.promisify(glob)(path.join(this.dir, 'gen', 'src', '*'));
        const files = await Promise.all(paths.map((p) => path.basename(p)));
        const contents = await Promise.all(paths.map((p) => fs_1.readFile(p, 'utf-8')));
        return {
            pkg: JSON.parse(await fs_1.readFile(path.join(this.dir, 'gen', 'package.json'), 'utf-8')),
            code: lodash_1.zipObject(files, contents),
        };
    }
}
ava_1.default('generate generates only client code when requested', utils_2.pass, async () => {
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
    ]);
    chai_1.expect(pkg.dependencies.koa).to.be.a('undefined');
    chai_1.expect(pkg.dependencies.request).to.be.a('string');
});
ava_1.default('generate generates only server code when requested', utils_2.pass, async () => {
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
ava_1.default('generate respects optional params', utils_2.pass, async () => {
    const iface = `
export interface A {
  readonly optional?: number;
  readonly required: number;
}`;
    const { code } = await new TestCase(iface).generate(types_1.Role.SERVER);
    chai_1.expect(code['interfaces.ts']).to.contain(iface.trim());
});
ava_1.default('generate respects optional attributes in return value', utils_2.pass, async () => {
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
ava_1.default('generate generates declarations of root level union types', utils_2.pass, async () => {
    const iface = 'export type A = { a: number; } | { b: number; };';
    const { code } = await new TestCase(iface).generate(types_1.Role.SERVER);
    chai_1.expect(code['interfaces.ts']).to.contain(iface);
});
ava_1.default('generate generates declarations of root level enums', utils_2.pass, async () => {
    const iface = `
export enum A {
  A = 'a',
  B = 'b',
  C_1 = 'c-1',
}`;
    const { code } = await new TestCase(iface).generate(types_1.Role.SERVER);
    chai_1.expect(code['interfaces.ts']).to.contain(iface.trim());
});
//# sourceMappingURL=test_generate.js.map