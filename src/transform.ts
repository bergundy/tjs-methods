import { fromPairs, isPlainObject, flatMap, mapValues, partition } from 'lodash';
import * as toposort from 'toposort';

type Pair = [string, any];

interface TypeDef {
  type?: string;
  format?: string;
  $ref?: string;
  anyOf?: TypeDef[];
  allOf?: TypeDef[];
  properties?: { [name: string]: TypeDef };
  items?: TypeDef | TypeDef[];
}

export function typeToString(def: TypeDef): string {
  const { type, format, $ref, anyOf, allOf, properties, items } = def;
  if (typeof type === 'string') {
    if (type === 'object') {
      if (isPlainObject(properties)) {
        const propString = Object.entries(properties!).map(([n, p]) => `${n}: ${typeToString(p)};`).join(' ');
        return `{ ${propString} }`;
      }
      return '{}';
    }
    if (type === 'array') {
      if (Array.isArray(items)) {
        return `[${items.map(typeToString).join(', ')}]`;
      } else if (isPlainObject(items)) {
        return `${typeToString(items!)}[]`;
      } else {
        throw new Error(`Invalid type for items: ${items}`);
      }
    }
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
  if (Array.isArray(anyOf)) {
    return anyOf.map(typeToString).join(' | ');
  }
  if (Array.isArray(allOf)) {
    return allOf.map(typeToString).join(' & ');
  }
  // tslint:disable-next-line no-console
  console.error('Could not determine type, defaulting to Object', def);
  return 'Object';
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
  throws: string[];
}

export interface ClassSpec {
    name: string;
    attributes: Array<{
      name: string;
      type: string;
    }>;
    methods: Method[];
}

export interface ServiceSpec {
  schema: string;
  classes: ClassSpec[];
  exceptions: ClassSpec[];
  context?: ClassSpec;
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

function isMethod(m): boolean {
  return m && m.properties && m.properties.params && m.properties.returns;
}

function isString(p): boolean {
  return p && p.type === 'string';
}

function isException(s): boolean {
  const props = s && s.properties;
  return ['name', 'message', 'stack'].every((p) => isString(props[p]));
}

export function transformClassPair([className, { properties }]: Pair): ClassSpec {
  return {
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
        throws: method.properties.throws ? typeToString(method.properties.throws).split(' | ') : [],
      };
    }),
    attributes: Object.entries(properties)
    .filter(([_, method]: Pair) => !isMethod(method))
    .map(([attrName, attrDef]: Pair) => ({
      name: attrName,
      type: typeToString(attrDef),
    })),
  };
}

export function transform(schema): ServiceSpec {
  const { definitions } = schema;
  const sortedDefinitions = sortDefinitions(definitions);
  const classDefinitions = sortedDefinitions.filter(([_, { properties }]: Pair) => properties);
  const [exceptionsWithName, classesWithName] = partition(classDefinitions, ([_, s]) => isException(s));
  const exceptions = exceptionsWithName.map(transformClassPair);
  const classes = classesWithName.map(transformClassPair);
  const context = classes.find(({ name }) => name === 'Context');
  return {
    schema: JSON.stringify(schema),
    classes,
    exceptions,
    context,
  };
}
