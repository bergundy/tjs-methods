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

{{#classes}}
{{^attributes}}
export class {{name}}Client {
  {{#methods}}
  public async {{name}}({{#parameters}}{{name}}: {{type}}{{^last}}, {{/last}}{{/parameters}}): Promise<{{returnType}}> {
  }
  {{/methods}}
}
{{/attributes}}

{{/classes}}
