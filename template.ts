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
    return await request.post(this.serverUrl, {
      json: true,
      body: {
        method: '{{name}}',
        args: [
          {{#parameters}}
          {{name}},
          {{/parameters}}
        ],
      }
    }) as {{returnType}};
  }
  {{/methods}}
}
{{/attributes}}

{{/classes}}

// Server Code
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

{{#classes}}
{{^attributes}}

export class {{name}}Server {
  protected app: Koa;

  // tslint:disable-next-line:no-shadowed-variable
  public constructor(protected readonly handler: {{name}}, stackTraceInError = false) {
    this.app = new Koa();

    this.app.use(errors({
      postFormat: (e, { stack, ...rest }) => stackTraceInError ? { stack, ...rest } : rest,
    }));
    this.app.use(bodyParser());
    this.app.use(validate(schema, '{{name}}'));
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
{{/attributes}}
{{/classes}}
