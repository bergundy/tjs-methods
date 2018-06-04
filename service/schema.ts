export const schema = {"$schema":"http://json-schema.org/draft-06/schema#","definitions":{"Example":{"type":"object","properties":{"add":{"minimum":0,"returnType":"number","type":"array","maxItems":2,"items":[{"type":"number"},{"type":"number"}]},"auth":{"returnType":{"$ref":"#/definitions/User"},"type":"array","maxItems":1,"items":{"type":"string"}},"getTimeOfDay":{"returnType":"string","type":"array","maxItems":0,"items":{}},"hello":{"returnType":"string","type":"array","maxItems":1,"items":{"$ref":"defs#/definitions/User"}}}},"User":{"required":["createdAt","name"],"type":"object","properties":{"createdAt":{"description":"Enables basic storage and retrieval of dates and times.","format":"date-time","type":"string"},"name":{"type":"string"}}}}};

export interface User {
  readonly createdAt: string;
  readonly name: string;
}

export interface Example {
  add(a: number, b: number): Promise<number>;
  auth(name: string): Promise<User>;
  getTimeOfDay(): Promise<string>;
  hello(user: User): Promise<string>;
}


// Client code
import * as request from 'request-promise-native';


export class ExampleClient {
  public constructor(protected readonly serverUrl: string, protected readonly connectTimeout: number = 3.0) {
  }

  public async add(a: number, b: number): Promise<number> {
    return await request.post(this.serverUrl, {
      json: true,
      body: {
        method: 'add',
        args: [
          a,
          b,
        ],
      }
    }) as number;
  }

  public async auth(name: string): Promise<User> {
    return await request.post(this.serverUrl, {
      json: true,
      body: {
        method: 'auth',
        args: [
          name,
        ],
      }
    }) as User;
  }

  public async getTimeOfDay(): Promise<string> {
    return await request.post(this.serverUrl, {
      json: true,
      body: {
        method: 'getTimeOfDay',
        args: [
        ],
      }
    }) as string;
  }

  public async hello(user: User): Promise<string> {
    return await request.post(this.serverUrl, {
      json: true,
      body: {
        method: 'hello',
        args: [
          user,
        ],
      }
    }) as string;
  }
}


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


export class ExampleServer {
  protected app: Koa;

  // tslint:disable-next-line:no-shadowed-variable
  public constructor(protected readonly handler: Example, stackTraceInError = false) {
    this.app = new Koa();

    this.app.use(errors({
      postFormat: (e, { stack, ...rest }) => stackTraceInError ? { stack, ...rest } : rest,
    }));
    this.app.use(bodyParser());
    this.app.use(validate(schema, 'Example'));
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
