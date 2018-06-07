import { isPlainObject, zip, get, mapValues } from 'lodash';

function resolveRefs(schema, definitions) {
  if (schema.$ref) {
    const getter = schema.$ref.replace(/^defs#\//, '').replace(/\//g, '.');
    return resolveRefs(get(definitions, getter), definitions);
  }
  if (Array.isArray(schema)) {
    return schema.map((s) => resolveRefs(s, definitions));
  }
  if (isPlainObject(schema)) {
    return mapValues(schema, (s) => resolveRefs(s, definitions));
  }
  return schema;
}

function coerceWithSchema(schema, value) {
  if (schema.type === 'array') {
    if (Array.isArray(schema.items)) {
      return zip(schema.items, value).map(([s, v]) => coerceWithSchema(s, v));
    }
    return value.map((v) => coerceWithSchema(schema.items, v));
  }
  if (schema.properties) {
    return mapValues(value, (v, k) => coerceWithSchema(schema.properties[k], v));
  }
  if (schema.type === 'string' && schema.format === 'date-time') {
    return new Date(value);
  }
  return value;
}

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
      [m, resolveRefs(schema.definitions.{{name}}.properties[m].properties.returns, schema)]));
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
    return coerceWithSchema(this.schemas.{{name}}, ret) as {{returnType}};
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
      [m, resolveRefs(schema.definitions.{{name}}.properties[m].properties.params, schema)]));

    this.router.post('/:method', validate(schema, '{{name}}'));
    this.router.post('/:method', async (ctx) => {
      const { method } = ctx.params;
      const args = (ctx.request as any).body;
      const coerced = coerceWithSchema(this.schemas[method], args);
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
