import * as fs from 'mz/fs';
import { fromPairs, isPlainObject, flatMap } from 'lodash';
import * as toposort from 'toposort';

async function loadJson(path) {
  return JSON.parse(await fs.readFile(path));
}
type Pair = [string, any];

type ReturnType = string | {
 $ref: string;
};

export function typeToString(returnType: ReturnType): string {
  if (typeof returnType === 'string') {
    if (returnType === 'integer') {
      return 'number';
    }
    return returnType;
  }
  return returnType.$ref.replace(/#\/definitions\//, '');
}

export interface MethodSpec {
  classes: Array<{
    name: string,
    methods: Array<{
      name: string,
      returnType: string,
    }>,
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

export function transform(schema): MethodSpec {
  const { definitions } = schema;
  const sortedDefinitions = sortDefinitions(definitions);
  return {
    classes: sortedDefinitions.map(([className, { properties }]: Pair) => ({
      name: className,
      methods: Object.entries(properties)
      .filter(([_, v]: Pair) => v.type === 'method')
      .map(([methodName, { returnType, parameters }]: Pair) => ({
        name: methodName,
        parameters: parameters.map(({ name, type }, i) => ({
          name,
          type: typeToString(type),
          last: i === parameters.length - 1,
        })),
        returnType: typeToString(returnType),
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
