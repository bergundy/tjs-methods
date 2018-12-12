"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
exports.spawn = (command, args, options) => new Promise((resolve, reject) => {
    const child = child_process_1.spawn(command, args, options);
    child.on('close', (code) => {
        if (code === 0) {
            resolve(code);
        }
        else {
            const fullCommand = [command].concat(args || []).join(' ');
            reject(new Error(`command: '${fullCommand}' failed process failed with exit code: ${code}`));
        }
    });
    child.on('error', reject);
});
//# sourceMappingURL=utils.js.map