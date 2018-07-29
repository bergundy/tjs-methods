// tslint:disable
export const schema = {{{schema}}};

export class InternalServerError extends Error {
}

{{#exceptions}}
export class {{name}} extends Error {
}

{{/exceptions}}
{{#classes}}
export interface {{name}} {
  {{#attributes}}
  readonly {{name}}{{#optional}}?{{/optional}}: {{type}};
  {{/attributes}}
  {{#methods}}
  {{name}}({{#parameters}}{{name}}: {{type}}{{^last}}, {{/last}}{{/parameters}}): Promise<{{returnType}}>;
  {{/methods}}
}

{{/classes}}
