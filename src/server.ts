import * as Koa from 'koa';
import * as http from 'http';
import * as bodyParser from 'koa-bodyparser';
import * as errors from 'koa-json-error';
import * as Ajv from 'ajv';

// tslint:disable-next-line:no-shadowed-variable
export function validate(schema: { definitions: any }, className: string) {
  const ajv = new Ajv({ useDefaults: true });
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
  ajv.addSchema({ ...schema, $id: 'defs' });
  const validators = {};
  const methods = Object.entries(schema.definitions[className].properties);
  for (const [method, s] of methods) {
    validators[method] = ajv.compile(s);
  }
  return async (ctx, next) => {
    const { method, args } = ctx.request.body;
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

export class Server<T> {
  protected app: Koa;

  // tslint:disable-next-line:no-shadowed-variable
  public constructor(protected readonly handler: T, schema: any, className: string, stackTraceInError = false) {
    this.app = new Koa();

    this.app.use(errors({
      postFormat: (e, { stack, ...rest }) => stackTraceInError ? { stack, ...rest } : rest,
    }));
    this.app.use(bodyParser());
    this.app.use(validate(schema, className));
    this.app.use(async (ctx) => {
      const { method, args } = (ctx.request as any).body;
      // TODO: validate body
      ctx.body = JSON.stringify(await this.handler[method](...args));
    });
  }

  public listen(port: number, host: string = 'localhost') {
    http.createServer(this.app.callback()).listen(port, host);
  }
}
