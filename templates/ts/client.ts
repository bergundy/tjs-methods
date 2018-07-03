// tslint:disable
import * as request from 'request-promise-native';
import { fromPairs } from 'lodash';
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
