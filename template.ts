import { coerceWithSchema } from '../dist/lib/common';  // TODO: fix import path

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
import { fromPairs } from 'lodash';

{{#classes}}
{{^attributes}}
export class {{name}}Client {
  public readonly static methods = [
    {{#methods}}
    '{{name}}',
    {{/methods}}
  ];

  public constructor(protected readonly serverUrl: string, protected readonly connectTimeout: number = 3.0) {
    this.schemas = fromPairs({{name}}Client.methods.map((m) =>
      [m, schema.definitions.{{name}}.properties[m].properties.returns, schema]));
  }
  {{#methods}}

  public async {{name}}({{#parameters}}{{name}}: {{type}}{{^last}}, {{/last}}{{/parameters}}): Promise<{{returnType}}> {
    const ret = await request.post(`${this.serverUrl}/{{name}}`, {
      json: true,
      body: {
        {{#parameters}}
        {{name}},
        {{/parameters}}
      }
    });
    return coerceWithSchema(this.schemas.{{name}}, ret, schema) as {{returnType}};
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

// tslint:disable-next-line:no-shadowed-variable
export function validate(schema: { definitions: any }, className: string) {
  const ajv = new Ajv({ useDefaults: true });
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
  for (const [k, v] of Object.entries(schema.definitions)) {
    ajv.addSchema(v, `#/definitions/${k}`);
  }
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
  public readonly static methods = [
    {{#methods}}
    '{{name}}',
    {{/methods}}
  ];

  protected readonly app: Koa;
  protected readonly router: Router;

  // tslint:disable-next-line:no-shadowed-variable
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
