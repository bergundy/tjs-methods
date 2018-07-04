// tslint:disable
import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as http from 'http';
import * as bodyParser from 'koa-bodyparser';
import * as errors from 'koa-json-error';
import { fromPairs } from 'lodash';
import { validate } from './koaMW';
import { coerceWithSchema } from './common';
import {
  schema,
  InternalServerError,
  {{#exceptions}}
  {{name}},
  {{/exceptions}}
  {{#classes}}
  {{name}},
  {{/classes}}
} from './interfaces';

{{#classes}}
{{^attributes}}
export interface {{name}}Handler {
  {{#attributes}}
  readonly {{name}}: {{type}};
  {{/attributes}}
  {{#context}}extractContext(ctx: Koa.Context): Promise<Context>;{{/context}}
  {{#methods}}
  {{name}}({{#context}}ctx: Context, {{/context}}{{#parameters}}{{name}}: {{type}}{{^last}}, {{/last}}{{/parameters}}): Promise<{{returnType}}>;
  {{/methods}}
}

export class {{name}}Router {
  public static readonly methods = [
    {{#methods}}
    '{{name}}',
    {{/methods}}
  ];

  protected readonly schemas: { [method: string]: any };
  public readonly koaRouter: Router;

  constructor(
    protected readonly handler: {{name}}Handler,
    stackTraceInError = false,
  ) {
    this.koaRouter = new Router();
    this.schemas = fromPairs({{name}}Router.methods.map((m) =>
      [m, schema.definitions.{{name}}.properties[m].properties.params, schema]));

    this.koaRouter.use(errors({
      postFormat: (e, { stack, knownError, name, ...rest }) => {
        const base = stackTraceInError ? { stack } : {};
        name = knownError ? name : 'InternalServerError';
        return { ...base, ...rest, name };
      },
    }));
    this.koaRouter.use(bodyParser());
    this.koaRouter.post('/:method', validate(schema, '{{name}}'));
    this.koaRouter.post('/:method', async (ctx) => {
      const { method } = ctx.params;
      const args = (ctx.request as any).body;
      const coerced = coerceWithSchema(this.schemas[method], args, schema);
      const order = schema.definitions.{{name}}.properties[method].properties.params.propertyOrder;
      const sortedArgs = Object.entries(coerced).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)).map(([_, v]) => v);
      try {
        ctx.set('Content-Type', 'application/json');
        {{#context}}
        const extractedContext = await this.handler.extractContext(ctx);
        (ctx as any).extractedContext = extractedContext;
        ctx.body = JSON.stringify(await this.handler[method](extractedContext, ...sortedArgs));
        {{/context}}
        {{^context}}
        ctx.extractedContext = {};
        ctx.body = JSON.stringify(await this.handler[method](...sortedArgs));
        {{/context}}
      } catch (err) {
        {{#exceptions}}
        if (err instanceof {{name}}) {
          ctx.throw(500, 'Internal Server Error', {
            ...err,
            knownError: true,
            name: '{{name}}',
            message: err.message,
            stack: stackTraceInError ? err.stack : '',
          });
        }
        {{/exceptions}}
        throw err;
      }
    });
  }
}

export class {{name}}Server {
  protected readonly app: Koa;
  protected readonly router: {{name}}Router;

  public constructor(
    protected readonly handler: {{name}}Handler,
    stackTraceInError = false,
  ) {
    this.app = new Koa();
    this.router = new {{name}}Router(handler, stackTraceInError);

    this.app.use(this.router.koaRouter.routes());
    this.app.use(this.router.koaRouter.allowedMethods());
  }

  public listen(port: number, host: string = 'localhost'): Promise<http.Server> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(this.app.callback()).listen(port, host, () => resolve(server));
      server.once('error', reject);
    });
  }
}
{{/attributes}}
{{/classes}}
