import * as fs from 'mz/fs';
import { fromPairs, isPlainObject, flatMap } from 'lodash';
import * as toposort from 'toposort';

async function loadJson(path) {
  return JSON.parse(await fs.readFile(path));
}
type Pair = [string, any];

type TypeOrRef = string | {
 $ref: string;
};

interface TypeDef {
  type: TypeOrRef;
  format?: string;
}

export function typeToString({ type, format }: TypeDef): string {
  if (typeof type === 'string') {
    if (type === 'integer') {
      return 'number';
    }
    if (type === 'string' && format === 'date-time') {
      return 'Date';
    }
    return type;
  }
  return type.$ref.replace(/#\/definitions\//, '');
}

export interface Parameter {
  name: string;
  type: string;
  last: boolean;
}

export interface Method {
  name: string;
  parameters: Parameter[];
  returnType: string;
}

export interface ServiceSpec {
  schema: string;
  classes: Array<{
    name: string,
    attributes: Array<{
      name: string,
      type: string,
    }>,
    methods: Method[],
  }>;
}

export function findRefs(definition): string[] {
  if (isPlainObject(definition)) {
    const refs = flatMap(Object.values(definition), findRefs);
    if (definition.$ref) {
      return [definition.$ref, ...refs];
    }
    return refs;
  }
  if (Array.isArray(definition)) {
    return flatMap(definition, findRefs);
  }
  return [];
}

export function sortDefinitions(definitions): Pair[] {
  const order = toposort(flatMap(Object.entries(definitions), ([k, d]) =>
    findRefs(d).map((r) => [r.replace(/^#\/definitions\//, ''), k])
  ));
  return Object.entries(definitions).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
}

export function translateMethodParamType({ type }) {
  if (type.$ref) {
    return { $ref: `defs${type.$ref}` };
  }
  return { type };
}

export function translateMethodToValidSchema({ parameters, ...s }: any) {
  if (s.type === 'method') {
    const rest: any = {};
    if (parameters.length === 0) {
      rest.items = {};
    } else if (parameters.length === 1) {
      rest.items = translateMethodParamType(parameters[0]);
    } else {
      rest.items = parameters.map(translateMethodParamType);
    }
    return {
      ...s,
      type: 'array',
      maxItems: parameters.length,
      ...rest,
    };
  }
  return s;
}

export function translateMethodsToValidSchema({ definitions, ...rest }) {
  return {
    ...rest,
    definitions: fromPairs(Object.entries(definitions).map(([name, { properties, ...r }]: Pair) => [
      name,
      {
        ...r,
        properties: fromPairs(Object.entries(properties).map(([prop, s]) => [
          prop,
          translateMethodToValidSchema(s),
        ])),
      },
    ])),
  };
}

export function transform(schema): ServiceSpec {
  const { definitions } = schema;
  const sortedDefinitions = sortDefinitions(definitions);
  return {
    schema: JSON.stringify(translateMethodsToValidSchema(schema)),
    classes: sortedDefinitions.map(([className, { properties }]: Pair) => ({
      name: className,
      methods: Object.entries(properties)
      .filter(([_, v]: Pair) => v.type === 'method')
      .map(([methodName, method]: Pair): Method => ({
        name: methodName,
        parameters: method.parameters.map((param, i) => ({
          name: param.name,
          type: typeToString(param),
          last: i === method.parameters.length - 1,
        })),
        returnType: typeToString({ type: method.returnType }),
      })),
      attributes: Object.entries(properties)
      .filter(([_, v]: Pair) => v.type !== 'method')
      .map(([attrName, attrDef]: Pair) => ({
        name: attrName,
        type: typeToString(attrDef),
      })),
    })),
  };
}

async function main() {
  const schema = await loadJson('example/schema.json');
  const spec = transform(schema);
  console.log(JSON.stringify(spec));
}

main();