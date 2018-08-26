// tslint:disable
import * as request from 'request-promise-native';
import { CoreOptions, RequestAPI, RequiredUriUrl } from 'request';
import { createReturnTypeValidator, ClassValidator, ValidationError } from './common';
import {
  schema,
  InternalServerError,
  {{#exceptions}}
  {{name}},
  {{/exceptions}}
  {{#classes}}
  {{name}},
  {{/classes}}
  {{#enums}}
  {{name}},
  {{/enums}}
  {{#bypassTypes}}
  {{name}},
  {{/bypassTypes}}
} from './interfaces';

export {
  ValidationError,
};

export type Options = Pick<CoreOptions,
  'jar' |
  'auth' |
  'oauth' |
  'agent' |
  'agentOptions' |
  'agentClass' |
  'forever' |
  'headers' |
  'followRedirect' |
  'followAllRedirects' |
  'followOriginalHttpMethod' |
  'maxRedirects' |
  'removeRefererHeader' |
  'pool' |
  'timeout' |
  'localAddress' |
  'proxy' |
  'tunnel' |
  'strictSSL' |
  'rejectUnauthorized' |
  'time' |
  'gzip' |
  'preambleCRLF' |
  'postambleCRLF' |
  'withCredentials' |
  'key' |
  'cert' |
  'passphrase' |
  'ca'>;

{{#clientContext}}
export type Context = ClientContext;
{{/clientContext}}

{{#classes}}
{{^attributes}}
export class {{name}}Client {
  public static readonly methods = [
    {{#methods}}
    '{{name}}',
    {{/methods}}
  ];
  public static readonly validators: ClassValidator = createReturnTypeValidator(schema, '{{{name}}}');

  protected readonly props = schema.definitions.{{{name}}}.properties;

  protected readonly request: RequestAPI<request.RequestPromise, request.RequestPromiseOptions, RequiredUriUrl>;
  public readonly validators: ClassValidator; // We don't have class name in method scope because mustache sux

  public constructor(protected readonly serverUrl: string, protected readonly options: Options = {}) {
    this.request = request.defaults({ ...options, json: true, baseUrl: serverUrl }) as any;
    this.validators = {{{name}}}Client.validators;
  }
  {{#methods}}

  public async {{name}}({{#clientContext}}ctx: Context ,{{/clientContext}}{{#parameters}}{{name}}{{#optional}}?{{/optional}}: {{{type}}}, {{/parameters}}options?: Options): Promise<{{{returnType}}}> {
    try {
      const ret = await this.request.post('/{{name}}', {
        ...options,
        body: {
          args: {
            {{#parameters}}
            {{name}},
            {{/parameters}}
          },
          {{#clientContext}}
          context: ctx,
          {{/clientContext}}
        }
      });

      const validator = this.validators.{{{name}}};
      const wrapped = { returns: ret }; // wrapped for coersion
      if (!validator(wrapped)) {
        throw new ValidationError('Failed to validate response', validator.errors);
      }
      return wrapped.returns as {{{returnType}}};
    } catch (err) {
      if (err.statusCode === 400 && typeof err.response.body === 'object') {
        const body = err.response.body;
        if (body.name === 'ValidationError') {
          throw new ValidationError(body.message, body.errors);
        }
      } else if (err.statusCode === 500 && typeof err.response.body === 'object') {
        const body = err.response.body;
        {{#throws}}
        if (body.name === '{{.}}') {
          throw new {{.}}(body.message);
        }
        {{/throws}}
        throw new InternalServerError(body.message);
      }
      throw err;
    }
  }
  {{/methods}}
}
{{/attributes}}

{{/classes}}
