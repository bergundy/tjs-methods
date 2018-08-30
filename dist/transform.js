"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const toposort = require("toposort");
function typeToString(def) {
    const { type, format, $ref, anyOf, allOf, properties, required, items } = def;
    if (typeof type === 'string') {
        if (type === 'object') {
            if (lodash_1.isPlainObject(properties)) {
                const req = required || [];
                const propString = Object.entries(properties).map(([n, p]) => `${n}${req.includes(n) ? '' : '?'}: ${typeToString(p)};`).join(' ');
                return `{ ${propString} }`;
            }
            return '{}';
        }
        if (type === 'array') {
            if (Array.isArray(items)) {
                return `[${items.map(typeToString).join(', ')}]`;
            }
            else if (lodash_1.isPlainObject(items)) {
                return `${typeToString(items)}[]`;
            }
            else {
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
exports.typeToString = typeToString;
function findRefs(definition) {
    if (lodash_1.isPlainObject(definition)) {
        const refs = lodash_1.flatMap(Object.values(definition), findRefs);
        if (definition.$ref) {
            return [definition.$ref, ...refs];
        }
        return refs;
    }
    if (Array.isArray(definition)) {
        return lodash_1.flatMap(definition, findRefs);
    }
    return [];
}
exports.findRefs = findRefs;
function sortDefinitions(definitions) {
    const order = toposort(lodash_1.flatMap(Object.entries(definitions), ([k, d]) => findRefs(d).map((r) => [r.replace(/^#\/definitions\//, ''), k])));
    return Object.entries(definitions).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
}
exports.sortDefinitions = sortDefinitions;
function isMethod(m) {
    return m && m.properties && m.properties.params && m.properties.returns;
}
function isString(p) {
    return p && p.type === 'string';
}
function isException(s) {
    const props = s && s.properties;
    return ['name', 'message', 'stack'].every((p) => isString(props[p]));
}
function transformClassPair([className, { properties, required }]) {
    return {
        name: className,
        methods: Object.entries(properties)
            .filter(([_, method]) => isMethod(method))
            .map(([methodName, method]) => {
            const params = Object.entries(method.properties.params.properties);
            const order = method.properties.params.propertyOrder;
            const methRequired = method.properties.params.required || [];
            return {
                name: methodName,
                parameters: params
                    .sort(([n1], [n2]) => order.indexOf(n1) - order.indexOf(n2))
                    .map(([paramName, param], i) => ({
                    name: paramName,
                    type: typeToString(param),
                    optional: !methRequired.includes(paramName),
                    last: i === params.length - 1,
                })),
                returnType: typeToString(method.properties.returns).replace(/^null$/, 'void'),
                throws: method.properties.throws ? typeToString(method.properties.throws).split(' | ') : [],
            };
        }),
        attributes: Object.entries(properties)
            .filter(([_, method]) => !isMethod(method))
            .map(([attrName, attrDef]) => ({
            name: attrName,
            type: typeToString(attrDef),
            optional: !(required || []).includes(attrName),
        })),
    };
}
exports.transformClassPair = transformClassPair;
function transform(schema) {
    const { definitions } = schema;
    const sortedDefinitions = sortDefinitions(definitions);
    const classDefinitions = sortedDefinitions.filter(([_, { properties }]) => properties);
    const [exceptionsWithName, classesWithName] = lodash_1.partition(classDefinitions, ([_, s]) => isException(s));
    const exceptions = exceptionsWithName.map(transformClassPair);
    const classes = classesWithName.map(transformClassPair);
    const clientContext = classes.find(({ name }) => name === 'ClientContext');
    const serverOnlyContext = classes.find(({ name }) => name === 'ServerOnlyContext');
    const serverContext = clientContext
        ? (serverOnlyContext ? 'ClientContext & ServerOnlyContext' : 'ClientContext')
        : (serverOnlyContext ? 'ServerOnlyContext' : undefined);
    return {
        schema: JSON.stringify(schema),
        classes,
        exceptions,
        clientContext,
        serverOnlyContext,
        serverContext,
    };
}
exports.transform = transform;
//# sourceMappingURL=transform.js.map