"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs_1 = require("mz/fs");
const eventToPromise = require("event-to-promise");
const child_process_1 = require("child_process");
const tsconfig = {
    version: '2.4.2',
    compilerOptions: {
        lib: ['es2017', 'esnext'],
        target: 'es2017',
        module: 'commonjs',
        moduleResolution: 'node',
        emitDecoratorMetadata: true,
        checkJs: false,
        allowJs: false,
        experimentalDecorators: true,
        downlevelIteration: true,
        sourceMap: true,
        declaration: true,
        strictNullChecks: true,
    },
    include: [
        '*.ts',
    ],
    exclude: [
        'node_modules',
    ],
};
const spawn = (command, args, options) => eventToPromise(child_process_1.spawn(command, args, options), 'exit');
async function publish(genPath, role, name, version, tag) {
    const npm = (...args) => spawn('npm', args, { cwd: genPath, stdio: 'inherit' });
    await fs_1.writeFile(path.join(genPath, 'tsconfig.json'), JSON.stringify(tsconfig));
    const depsStr = await fs_1.readFile(path.join(genPath, `${role}Deps`), 'utf8');
    const dependencies = depsStr.split('\n').filter((s) => s !== '');
    const devDependencies = ['@types/node'];
    const pkg = {
        main: `${role}.js`,
        types: `${role}.d.ts`,
        name: `${name}-${role}`,
        version,
    };
    await fs_1.writeFile(path.join(genPath, 'package.json'), JSON.stringify(pkg));
    await npm('i', ...dependencies);
    await npm('i', '-D', ...devDependencies);
    await spawn('tsc', [], { cwd: genPath, stdio: 'inherit' });
    if (tag) {
        await npm('publish', '--tag', tag);
    }
    else {
        await npm('publish');
    }
}
exports.publish = publish;
//# sourceMappingURL=publish.js.map