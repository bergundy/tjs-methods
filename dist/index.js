"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("mz/fs");
const lodash_1 = require("lodash");
const glob = require("glob");
const ts = require("typescript");
const tjs = require("typescript-json-schema");
const mustache = require("mustache");
const util_1 = require("util");
const path = require("path");
const transform_1 = require("./transform");
const tmplPath = (name) => path.join(__dirname, '..', 'templates', 'ts', name);
const libPath = path.join(__dirname, '..', 'src', 'lib');
const names = ['interfaces', 'client', 'server'];
async function getLib() {
    const files = await fs_1.readdir(libPath);
    return files.filter((f) => !f.startsWith('test'));
}
async function generate(filePattern) {
    const paths = await util_1.promisify(glob)(filePattern);
    const settings = {
        required: true,
        noExtraProps: true,
        propOrder: true,
    };
    const compilerOptions = {
        strictNullChecks: true,
        target: ts.ScriptTarget.ESNext,
        noEmit: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        module: ts.ModuleKind.CommonJS,
        allowUnusedLabels: true,
    };
    const libFiles = await getLib();
    const libContents = await Promise.all(libFiles.map((n) => fs_1.readFile(path.join(libPath, n), 'utf-8')));
    const program = ts.createProgram(paths, compilerOptions);
    const generator = tjs.buildGenerator(program, settings, paths);
    const schema = tjs.generateSchema(program, '*', settings, paths);
    const spec = transform_1.transform(schema);
    const genFiles = names.map((n) => `${n}.ts`);
    const templates = await Promise.all(genFiles.map((n) => fs_1.readFile(tmplPath(n), 'utf-8')));
    const rendered = templates.map((t) => mustache.render(t, spec));
    return Object.assign({ clientDeps: ['lodash', 'ajv', 'request-promise-native', 'request', ''].join('\n'), serverDeps: ['lodash', 'ajv', 'koa', 'koa-router', 'koa-json-error', 'koa-bodyparser', ''].join('\n') }, lodash_1.fromPairs(lodash_1.zip([...libFiles, ...genFiles], [...libContents, ...rendered])));
}
exports.generate = generate;
//# sourceMappingURL=index.js.map