import { isPlainObject } from 'lodash';
import * as koaRouter from 'koa-router';
import * as koaBody from 'koa-bodyparser'; // tslint:disable-line:no-unused-variable
import { createClassValidator, createInterfaceValidator } from './common';

export function validate(schema: { definitions: any }, className: string) {
  const contextValidator = schema.definitions.ClientContext
    ? createInterfaceValidator(schema, 'ClientContext') : undefined;
  const validators = createClassValidator(schema, className, 'params');
  return async (ctx: koaRouter.IRouterContext, next: () => Promise<any>) => {
    const { method } = ctx.params;
    if (!isPlainObject(ctx.request.body)) {
      ctx.throw(400, 'Bad Request', {
        knownError: true,
        name: 'ValidationError',
        errors: [{ message: 'Could not parse body', method }],
      });
    }
    const { context, args } = ctx.request.body as any;
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
