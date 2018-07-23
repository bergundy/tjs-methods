"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const crypto_1 = require("crypto");
const fs_1 = require("mz/fs");
const path = require("path");
const yargs = require("yargs");
const rmrf = require("rmfr");
const index_1 = require("./index");
const publish_1 = require("./publish");
function mktemp() {
    return path.join('/tmp', `generated-${crypto_1.randomBytes(20).toString('hex')}`);
}
const argv = yargs
    .command('$0 <pattern>', 'launch code generator', (y) => y
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
    default: index_1.Role.ALL,
    choices: Object.values(index_1.Role),
    describe: 'Generate specific role',
})
    .option('publish', {
    type: 'string',
    alias: 'p',
    describe: 'Publish as npm package with format of <packageName>@<version> (e.g. myservice@1.2.3)',
})
    .option('publish-tag', {
    type: 'string',
    alias: 't',
    describe: 'When `publish` is specified, publish to a specific tag (see `npm publish --tag`)',
})
    .argv;
async function genCode(pattern, genPath, role) {
    const st = await fs_1.stat(genPath);
    if (!st.isDirectory()) {
        throw new Error(`output dir: ${genPath} is not a directory`);
    }
    const schemaCode = await index_1.generate(pattern, role);
    await Promise.all(Object.entries(schemaCode).map(([n, c]) => fs_1.writeFile(path.join(genPath, n), c)));
}
async function main({ pattern, output, role, publish, 'publish-tag': tag }) {
    if (output) {
        await genCode(pattern, output, role);
    }
    else if (publish) {
        if (!role || role === index_1.Role.ALL) {
            throw new Error('Must specify `role` (client or server) option with `publish`');
        }
        const parts = publish.split('@');
        if (parts.length < 2) {
            throw new Error(`publish param should have a @ character for version, got ${publish}`);
        }
        const genPath = mktemp();
        await fs_1.mkdir(genPath);
        try {
            await genCode(pattern, genPath, role);
            const name = parts.slice(0, -1).join('@');
            const version = parts[parts.length - 1];
            await publish_1.publish(genPath, role, name, version, tag);
        }
        finally {
            await rmrf(genPath);
        }
    }
    else {
        throw new Error('Must specify one of `publish` or `output`');
    }
}
main(argv).catch((err) => {
    process.stderr.write(`Failed to generate files:\n${util_1.format(err)}\n`);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map