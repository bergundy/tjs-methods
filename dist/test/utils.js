"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function pass(t, fn) {
    await fn();
    t.pass();
}
exports.pass = pass;
//# sourceMappingURL=utils.js.map