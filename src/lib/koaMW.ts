import { createClassValidator } from './common';

export function validate(schema: { definitions: any }, className: string) {
  const validators = createClassValidator(schema, className, 'params');
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
