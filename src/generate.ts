import * as fs from 'mz/fs';
import { fromPairs, isPlainObject, flatMap, mapValues } from 'lodash';
import * as toposort from 'toposort';

async function loadJson(path) {
  return JSON.parse(await fs.readFile(path));
}
type Pair = [string, any];

interface TypeDef {
  type?: string;
  format?: string;
  $ref?: string;
}

export function typeToString({ type, format, $ref }: TypeDef): string {
  if (typeof type === 'string') {
    if (type === 'integer') {
      return 'number';
    }
    if (type === 'string' && format === 'date-time') {
      return 'Date';
    }
    return type;
  }
  if (typeof $ref === 'string') {
    return $ref.replace(/#\/definitions\//, '');
  }
  throw new Error('Could not determine type');
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

function isMethod(m) {
  return m && m.properties && m.properties.params && m.properties.returns;
}

export function transform(schema): ServiceSpec {
  const { definitions } = schema;
  const sortedDefinitions = sortDefinitions(definitions);
  return {
    schema: JSON.stringify(schema),
    classes: sortedDefinitions
    .filter(([_, { properties }]: Pair) => properties)
    .map(([className, { properties }]: Pair) => ({
      name: className,
      methods: Object.entries(properties)
      .filter(([_, method]: Pair) => isMethod(method))
      .map(([methodName, method]: Pair): Method => {
        const params = Object.entries(method.properties.params.properties);
        const order = method.properties.params.propertyOrder;
        return {
          name: methodName,
          parameters: params
          .sort(([n1], [n2]) => order.indexOf(n1) - order.indexOf(n2))
          .map(([paramName, param], i) => ({
            name: paramName,
            type: typeToString(param as TypeDef),
            last: i === params.length - 1,
          })),
          returnType: typeToString(method.properties.returns),
        };
      }),
      attributes: Object.entries(properties)
      .filter(([_, method]: Pair) => !isMethod(method))
      .map(([attrName, attrDef]: Pair) => ({
        name: attrName,
        type: typeToString(attrDef),
      })),
    })),
  };
}

async function main() {
  try {
    const schema = await loadJson('example/schema.json');
    const spec = transform(schema);
    console.log(JSON.stringify(spec));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
