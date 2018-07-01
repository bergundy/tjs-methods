"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
function validate(schema, className) {
    const validators = common_1.createClassValidator(schema, className, 'params');
    return async (ctx, next) => {
        const { method } = ctx.params;
        const args = ctx.request.body;
        const validator = validators[method];
        if (!validator) {
            ctx.throw(400, 'Bad Request', {
                errors: [{ message: 'Method not supported', method }],
            });
        }
        if (!validator(args)) {
            ctx.throw(400, 'Bad Request', {
                errors: validator.errors,
            });
        }
        await next();
    };
}
exports.validate = validate;
//# sourceMappingURL=koaMW.js.map