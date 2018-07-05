"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const fs_1 = require("mz/fs");
const path = require("path");
const yargs = require("yargs");
const index_1 = require("./index");
const argv = yargs
    .command('$0 <pattern>', 'launch code generator', (y) => y
    .positional('pattern', {
    type: 'string',
    describe: 'Files matching this pattern will be evaluated as input',
}))
    .option('output', {
    type: 'string',
    alias: 'o',
    demandOption: true,
    describe: 'Directory to output generated files',
})
    .option('role', {
    type: 'string',
    alias: 'r',
    default: index_1.Role.ALL,
    choices: Object.values(index_1.Role),
    describe: 'Generate specific role',
})
    .argv;
async function main({ pattern, output, role }) {
    try {
        const st = await fs_1.stat(output);
        if (!st.isDirectory()) {
            throw new Error(`output dir: ${output} is not a directory`);
        }
        const schemaCode = await index_1.generate(pattern, role);
        await Promise.all(Object.entries(schemaCode).map(([n, c]) => fs_1.writeFile(path.join(output, n), c)));
    }
    catch (err) {
        process.stderr.write(`Failed to generate files:\n${util_1.format(err)}\n`);
        process.exit(1);
    }
}
main(argv);
//# sourceMappingURL=cli.js.map