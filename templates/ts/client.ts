// tslint:disable
import { Readable as ReadableStream } from 'stream';
import * as request from 'request';
import * as FormData from 'form-data';
import { Response, CoreOptions, RequestAPI, RequiredUriUrl } from 'request';
import { STREAMS, Pipe, serialize, streamToBuffer, parseForm, createReturnTypeValidator, ClassValidator, ValidationError } from './common';
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

  protected readonly request: RequestAPI<request.Request, request.Options, RequiredUriUrl>;
  public readonly validators: ClassValidator; // We don't have class name in method scope because mustache sux

  public constructor(protected readonly serverUrl: string, protected readonly options: Options = {}) {
    this.request = request.defaults({ ...options, baseUrl: serverUrl }) as any;
    this.validators = {{{name}}}Client.validators;
  }
  {{#methods}}

  public async {{name}}({{#clientContext}}ctx: Context ,{{/clientContext}}{{#parameters}}{{name}}{{#optional}}?{{/optional}}: {{{type}}}, {{/parameters}}options?: Options): Promise<{{{returnType}}}> {
    const { statusCode, body: responseBody, isJSON, streams } = await this.makeRequest('/{{{name}}}', {
      args: {
        {{#parameters}}
        {{name}},
        {{/parameters}}
      },
      {{#clientContext}}
      context: ctx,
      {{/clientContext}}
    });
    if (statusCode >= 200 && statusCode < 300) {
      const validator = this.validators.{{{name}}};
      const wrapped = { returns: responseBody, [STREAMS]: streams }; // wrapped for coersion
      if (!validator(wrapped)) {
        throw new ValidationError('Failed to validate response', validator.errors);
      }
      return wrapped.returns as {{{returnType}}};
    } else if (statusCode === 400 && isJSON && responseBody.name === 'ValidationError') {
      throw new ValidationError(responseBody.message, responseBody.errors);
    } else if (statusCode === 500 && isJSON) {
      {{#throws}}
      if (responseBody.name === '{{.}}') {
        throw new {{.}}(responseBody.message);
      }
      {{/throws}}
      throw new InternalServerError(responseBody.message);
    } else {
      throw new Error(`${statusCode} ${responseBody}`);
    }
  }
  {{/methods}}

  protected makeRequest(url: string, data: any, options?: Options) {
		return new Promise<{ body: any; streams?: Record<string, ReadableStream>; statusCode: number, isJSON: boolean, response: Response }>((resolve, reject) => {
      const { body, streams } = serialize(data);
      const form = new FormData();
      form.append('body', body);
      for (const i in streams) {
        form.append(`${i}`, streams[i]);
      }

			this.request.post({
				...options,
        url,
				...(streams.length ? {
					headers: {
						...(options || {}).headers,
						...form.getHeaders(),
					},
          body: form,
				} : {
					headers: {
						...(options || {}).headers,
						'Content-Type': 'application/json',
					},
					body,
				})
			})
			.on('error', reject)
			.on('response', async (response: Response) => {
				const { headers, statusCode } = response;
        const base = { statusCode, response };
				if (headers['content-type'] && headers['content-type'].startsWith('application/json')) {
          const body = await streamToBuffer(response);
          resolve({
            ...base,
            body: JSON.parse(body.toString()),
            isJSON: true,
          });
        } else if (headers['content-type'] && headers['content-type'].startsWith('multipart/mixed')) {
          const { body, streams } = await parseForm(response);
          resolve({ ...base, body, streams, isJSON: true });
        } else if (headers['content-length'] && headers['content-length'] === '0') {
          resolve({ ...base, body: undefined, isJSON: false }); 
				} else {
          const buffer = await streamToBuffer(response);
          const body = buffer.toString();
          resolve({ ...base, body, isJSON: false }); 
        }
			});
		});
  }
}
{{/attributes}}

{{/classes}}
