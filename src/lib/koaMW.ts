import { createClassValidator, createInterfaceValidator } from './common';

export function validate(schema: { definitions: any }, className: string) {
  const contextValidator = schema.definitions.ClientContext
    ? createInterfaceValidator(schema, 'ClientContext') : undefined;
  const validators = createClassValidator(schema, className, 'params');
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
