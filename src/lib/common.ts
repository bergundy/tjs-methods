import { zip, get, mapValues, fromPairs } from 'lodash';
import * as Ajv from 'ajv';

export function coerceWithSchema(schema: any, value: any, defsSchema = {}): any {
  if (schema.$ref) {
    const getter = schema.$ref.replace(/^#\//, '').replace(/\//g, '.');
    schema = get(defsSchema, getter);
  }
  if (schema.type === 'array') {
    if (Array.isArray(schema.items)) {
      return zip(schema.items, value).map(([s, v]) => coerceWithSchema(s, v, defsSchema));
    }
    return value.map((v) => coerceWithSchema(schema.items, v, defsSchema));
  }
  if (schema.properties) {
    return mapValues(value, (v, k) => coerceWithSchema(schema.properties[k], v, defsSchema));
  }
  if (schema.type === 'string' && schema.format === 'date-time') {
    return new Date(value);
  }
  return value;
}

export interface ClassValidator {
  [method: string]: Ajv.ValidateFunction;
}

export function createClassValidator(schema: { definitions: any }, className, field): ClassValidator {
  const ajv = new Ajv({ useDefaults: true });
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
  for (const [k, v] of Object.entries(schema.definitions)) {
    ajv.addSchema(v, `#/definitions/${k}`);
  }
  return fromPairs(Object.entries(schema.definitions[className].properties).map(([method, s]) => [
    method, ajv.compile((s as any).properties[field]),
  ]));
}

export function createInterfaceValidator(schema: { definitions: any }, ifaceName: string): Ajv.ValidateFunction {
  const ajv = new Ajv({ useDefaults: true });
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
  for (const [k, v] of Object.entries(schema.definitions)) {
    ajv.addSchema(v, `#/definitions/${k}`);
  }
  return ajv.compile(schema.definitions[ifaceName]);
}
