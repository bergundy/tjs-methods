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
