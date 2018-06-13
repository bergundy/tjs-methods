import { zip, get, mapValues } from 'lodash';

export function coerceWithSchema(schema: any, value: any, defsSchema = {}) {
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
