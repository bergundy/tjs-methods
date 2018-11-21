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
const types_1 = require("./types");
const transform_1 = require("./transform");
const tmplPath = (name) => path.join(__dirname, '..', 'templates', 'ts', name);
const libPath = path.join(__dirname, '..', 'src', 'lib');
function getLib(role) {
    switch (role) {
        case types_1.Role.ALL:
        case types_1.Role.SERVER:
            return ['common.ts', 'koaMW.ts'];
        case types_1.Role.CLIENT:
            return ['common.ts'];
    }
}
function getTemplateNames(role) {
    switch (role) {
        case types_1.Role.SERVER:
            return ['interfaces', 'server'];
        case types_1.Role.CLIENT:
            return ['interfaces', 'client'];
        case types_1.Role.ALL:
            return ['interfaces', 'client', 'server'];
    }
}
function getPackage(role) {
    // @types packages could have been peer dependencies but we decided
    // to put these here to simplify usage of generate code
    const base = {
        dependencies: {
            ajv: '^6.5.5',
            lodash: '^4.17.11',
        },
        devDependencies: {
            '@types/lodash': '^4.14.118',
            '@types/node': '^10.12.6',
        },
    };
    const serverOnly = {
        dependencies: {
            '@types/koa': '^2.0.46',
            '@types/koa-bodyparser': '^5.0.1',
            '@types/koa-router': '^7.0.33',
            koa: '^2.5.1',
            'koa-bodyparser': '^4.2.1',
            'koa-json-error': '^3.1.2',
            'koa-router': '^7.4.0',
        },
        devDependencies: {
            '@types/koa-json-error': '^3.1.2',
        },
        // Only peer dependency and common in typescript packages
        // It's is left as a peerDependency and not a dependency because it depends on node version
        peerDependencies: {
            '@types/node': '>=8.0.0',
        },
    };
    const clientOnly = {
        dependencies: {
            '@types/request': '^2.48.1',
            '@types/request-promise-native': '^1.0.15',
            request: '^2.88.0',
            'request-promise-native': '^1.0.5',
        },
    };
    switch (role) {
        case types_1.Role.SERVER:
            return lodash_1.merge(base, serverOnly);
        case types_1.Role.CLIENT:
            return lodash_1.merge(base, clientOnly);
        case types_1.Role.ALL:
            return lodash_1.merge(base, clientOnly, serverOnly);
    }
}
async function generate(filePattern, role = types_1.Role.ALL) {
    const paths = await util_1.promisify(glob)(filePattern);
    const settings = {
        required: true,
        noExtraProps: true,
        propOrder: true,
        validationKeywords: ['launchType'],
        include: paths,
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
    const libFiles = getLib(role);
    const libContents = await Promise.all(libFiles.map((n) => fs_1.readFile(path.join(libPath, n), 'utf-8')));
    const program = ts.createProgram(paths, compilerOptions);
    const schema = tjs.generateSchema(program, '*', settings, paths);
    const spec = transform_1.transform(schema);
    const genFiles = getTemplateNames(role).map((n) => `${n}.ts`);
    const templates = await Promise.all(genFiles.map((n) => fs_1.readFile(tmplPath(n), 'utf-8')));
    const rendered = templates.map((t) => mustache.render(t, spec));
    return {
        pkg: getPackage(role),
        code: lodash_1.fromPairs(lodash_1.zip([...libFiles, ...genFiles], [...libContents, ...rendered])),
    };
}
exports.generate = generate;
//# sourceMappingURL=index.js.map