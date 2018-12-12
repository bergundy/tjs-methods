"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const crypto_1 = require("crypto");
const fs_1 = require("mz/fs");
const path = require("path");
const yargs = require("yargs");
const rmrf = require("rmfr");
const index_1 = require("./index");
const types_1 = require("./types");
const output_1 = require("./output");
function mktemp() {
    return path.join('/tmp', `generated-${crypto_1.randomBytes(20).toString('hex')}`);
}
const argv = yargs
    .command('$0 <package> <pattern>', 'launch code generator', (y) => y
    .positional('package', {
    type: 'string',
    describe: 'Publish as npm package with format of <packageName>@<version> (e.g. myservice@1.2.3)',
})
    .positional('pattern', {
    type: 'string',
    describe: 'Files matching this pattern will be evaluated as input',
}))
    .option('output', {
    type: 'string',
    alias: 'o',
    describe: 'Directory to output generated files',
})
    .option('role', {
    type: 'string',
    alias: 'r',
    default: types_1.Role.ALL,
    choices: Object.values(types_1.Role),
    describe: 'Generate specific role',
})
    .option('nocompile', {
    type: 'boolean',
    default: false,
    describe: 'Skip compilation (mostly for tests)',
})
    .option('publish', {
    type: 'boolean',
    default: false,
    alias: 'p',
    describe: 'Publish as package to npm',
})
    .option('publish-tag', {
    type: 'string',
    alias: 't',
    describe: 'When `publish` is specified, publish to a specific tag (see `npm publish --tag`)',
})
    .argv;
async function main({ pattern, 'package': pkgName, 'nocompile': noCompile, output, role, publish, 'publish-tag': tag, }) {
    const parts = pkgName.split('@');
    if (parts.length < 2) {
        throw new Error(`package param should have a @ character for version, got ${pkgName}`);
    }
    const name = parts.slice(0, -1).join('@');
    const version = parts[parts.length - 1];
    if (publish) {
        if (!role || role === types_1.Role.ALL) {
            throw new Error('Must specify `role` (client or server) option with `publish`');
        }
    }
    const genPath = output || mktemp();
    if (genPath !== output) {
        await fs_1.mkdir(genPath);
    }
    try {
        const generator = await output_1.TSOutput.create(genPath);
        const generated = await index_1.generate(pattern, role);
        await generator.write(name, version, generated, role);
        if (!noCompile) {
            await generator.compile();
        }
        process.stdout.write(`Generated code in: ${genPath}\n`);
        if (publish) {
            await generator.publish(tag);
        }
    }
    finally {
        if (genPath !== output) {
            await rmrf(genPath);
        }
    }
}
main(argv).catch((err) => {
    process.stderr.write(`Failed to generate files:\n${util_1.format(err)}\n`);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map