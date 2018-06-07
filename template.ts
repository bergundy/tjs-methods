export const schema = {{{schema}}};

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

{{#classes}}
{{^attributes}}
export class {{name}}Client {
  public constructor(protected readonly serverUrl: string, protected readonly connectTimeout: number = 3.0) {
  }
  {{#methods}}

  public async {{name}}({{#parameters}}{{name}}: {{type}}{{^last}}, {{/last}}{{/parameters}}): Promise<{{returnType}}> {
    return await request.post(`${this.serverUrl}/{{name}}`, {
      json: true,
      body: {
        {{#parameters}}
        {{name}},
        {{/parameters}}
      }
    }) as {{returnType}};
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
import * as Ajv from 'ajv';
import { basename } from 'path';

// tslint:disable-next-line:no-shadowed-variable
export function validate(schema: { definitions: any }, className: string) {
  const ajv = new Ajv({ useDefaults: true });
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
  ajv.addSchema({ ...schema, $id: 'defs' });
  const validators = {};
  const methods = Object.entries(schema.definitions[className].properties);
  for (const [method, s] of methods) {
    validators[method] = ajv.compile(s.properties.params);
  }
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

{{#classes}}
{{^attributes}}

export class {{name}}Server {
  protected app: Koa;
  protected router: Router;

  // tslint:disable-next-line:no-shadowed-variable
  public constructor(protected readonly handler: {{name}}, stackTraceInError = false) {
    this.app = new Koa();
    this.router = new Router();

    this.router.post('/:method', validate(schema, '{{name}}'));
    this.router.post('/:method', async (ctx) => {
      const { method } = ctx.params;
      const args = (ctx.request as any).body;
      const order = schema.definitions.{{name}}.properties[method].properties.params.propertyOrder;
      const sortedArgs = Object.entries(args).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)).map(([_, v]) => v);
      // TODO: validate body
      ctx.body = JSON.stringify(await this.handler[method](...sortedArgs));
    });

    this.app.use(errors({
      postFormat: (e, { stack, ...rest }) => stackTraceInError ? { stack, ...rest } : rest,
    }));
    this.app.use(bodyParser());
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
  }

  public listen(port: number, host: string = 'localhost') {
    http.createServer(this.app.callback()).listen(port, host);
  }
}
{{/attributes}}
{{/classes}}
