import { coerceWithSchema } from '../../dist/lib/common';  // TODO: fix import path

export const schema = {{{schema}}};

export class InternalServerError extends Error {
}

{{#exceptions}}
export class {{name}} extends Error {
}

{{/exceptions}}
{{#classes}}
export interface {{name}} {
  {{#attributes}}
  readonly {{name}}: {{type}};
  {{/attributes}}
  {{#methods}}
  {{name}}({{#parameters}}{{name}}: {{type}}{{^last}}, {{/last}}{{/parameters}}): Promise<{{returnType}}>;
  {{/methods}}
}

{{/classes}}

// Client code
import * as request from 'request-promise-native';
import { fromPairs } from 'lodash';

{{#classes}}
{{^attributes}}
export class {{name}}Client {
  public static readonly methods = [
    {{#methods}}
    '{{name}}',
    {{/methods}}
  ];

  protected readonly schemas: { [method: string]: any };

  public constructor(protected readonly serverUrl: string, protected readonly connectTimeout: number = 3.0) {
    this.schemas = fromPairs({{name}}Client.methods.map((m) =>
      [m, schema.definitions.{{name}}.properties[m].properties.returns, schema]));
  }
  {{#methods}}

  public async {{name}}({{#parameters}}{{name}}: {{type}}{{^last}}, {{/last}}{{/parameters}}): Promise<{{returnType}}> {
    try {
      const ret = await request.post(`${this.serverUrl}/{{name}}`, {
        json: true,
        body: {
          {{#parameters}}
          {{name}},
          {{/parameters}}
        }
      });
      return coerceWithSchema(this.schemas.{{name}}, ret, schema) as {{returnType}};
    } catch (err) {
      const body = err.response.body;
      if (err.statusCode === 500) {
        {{#exceptions}}
        console.error(body.name, '{{name}}');
        if (body.name === '{{name}}') {
          throw new {{name}}(body.message);
        }
        {{/exceptions}}
        throw new InternalServerError(body.message);
      }
      throw err;
    }
  }
  {{/methods}}
}
{{/attributes}}

{{/classes}}

// Server Code
import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as http from 'http';
import * as bodyParser from 'koa-bodyparser';
import * as errors from 'koa-json-error';
import { validate } from '../../dist/lib/koaMW';  // TODO: fix import path

{{#classes}}
{{^attributes}}

export class {{name}}Server {
  public static readonly methods = [
    {{#methods}}
    '{{name}}',
    {{/methods}}
  ];

  protected readonly app: Koa;
  protected readonly router: Router;
  protected readonly schemas: { [method: string]: any };

  public constructor(protected readonly handler: {{name}}, stackTraceInError = false) {
    this.app = new Koa();
    this.router = new Router();
    this.schemas = fromPairs({{name}}Server.methods.map((m) =>
      [m, schema.definitions.{{name}}.properties[m].properties.params, schema]));

    this.router.post('/:method', validate(schema, '{{name}}'));
    this.router.post('/:method', async (ctx) => {
      const { method } = ctx.params;
      const args = (ctx.request as any).body;
      const coerced = coerceWithSchema(this.schemas[method], args, schema);
      const order = schema.definitions.{{name}}.properties[method].properties.params.propertyOrder;
      const sortedArgs = Object.entries(coerced).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)).map(([_, v]) => v);
      try {
        ctx.body = JSON.stringify(await this.handler[method](...sortedArgs));
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

    this.app.use(errors({
      postFormat: (e, { stack, knownError, name, ...rest }) => {
        const base = stackTraceInError ? { stack } : {};
        name = knownError ? name : 'InternalServerError';
        return { ...base, ...rest, name };
      },
    }));
    this.app.use(bodyParser());
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
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
