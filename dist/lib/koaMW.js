"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const common_1 = require("./common");
function validate(schema, className) {
    const contextValidator = schema.definitions.ClientContext
        ? common_1.createInterfaceValidator(schema, 'ClientContext') : undefined;
    const validators = common_1.createClassValidator(schema, className, 'params');
    return async (ctx, next) => {
        const { method } = ctx.params;
        if (!lodash_1.isPlainObject(ctx.request.body)) {
            ctx.throw(400, 'Bad Request', {
                knownError: true,
                name: 'ValidationError',
                errors: [{ message: 'Could not parse body', method }],
            });
        }
        const { context, args } = ctx.request.body;
        const validator = validators[method];
        if (!validator) {
            ctx.throw(400, 'Bad Request', {
                knownError: true,
                name: 'ValidationError',
                errors: [{ message: 'Method not supported', method }],
            });
        }
        if (contextValidator && !contextValidator(context)) {
            ctx.throw(400, 'Bad Request', {
                knownError: true,
                name: 'ValidationError',
                errors: contextValidator.errors,
            });
        }
        if (!validator(args)) {
            ctx.throw(400, 'Bad Request', {
                knownError: true,
                name: 'ValidationError',
                errors: validator.errors,
            });
        }
        await next();
    };
}
exports.validate = validate;
async function formMW(ctx, next) {
    if (ctx.get('content-type').startsWith('multipart/form-data')) {
        try {
            const { body, streams } = await common_1.parseForm(ctx.req);
            ctx.request.body = body;
            // TODO: this isn't pretty
            ctx.request.body.args[common_1.STREAMS] = streams;
        }
        catch (err) {
            ctx.throw(400, 'Bad Request', {
                knownError: true,
                name: 'ValidationError',
                errors: [{ message: 'Failed to parse multipart body' }],
            });
            return; // Typescript doesn't know that ctx.throw throws an error..
        }
    }
    await next();
}
exports.formMW = formMW;
//# sourceMappingURL=koaMW.js.map