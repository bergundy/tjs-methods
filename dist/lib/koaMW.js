"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
function validate(schema, className) {
    const contextValidator = schema.definitions.ClientContext
        ? common_1.createInterfaceValidator(schema, 'ClientContext') : undefined;
    const validators = common_1.createClassValidator(schema, className, 'params');
    return async (ctx, next) => {
        const { method } = ctx.params;
        const { context, args } = ctx.request.body;
        const validator = validators[method];
        if (!validator) {
            ctx.throw(400, 'Bad Request', {
                errors: [{ message: 'Method not supported', method }],
            });
        }
        if (contextValidator && !contextValidator(context)) {
            ctx.throw(400, 'Bad Request', {
                errors: contextValidator.errors,
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