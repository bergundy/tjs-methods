"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const Ajv = require("ajv");
function coerceWithSchema(schema, value, defsSchema = {}) {
    if (schema.$ref) {
        const getter = schema.$ref.replace(/^#\//, '').replace(/\//g, '.');
        schema = lodash_1.get(defsSchema, getter);
    }
    if (schema.type === 'array') {
        if (Array.isArray(schema.items)) {
            return lodash_1.zip(schema.items, value).map(([s, v]) => coerceWithSchema(s, v, defsSchema));
        }
        return value.map((v) => coerceWithSchema(schema.items, v, defsSchema));
    }
    if (schema.properties) {
        return lodash_1.mapValues(value, (v, k) => coerceWithSchema(schema.properties[k], v, defsSchema));
    }
    if (schema.type === 'string' && schema.format === 'date-time') {
        return new Date(value);
    }
    return value;
}
exports.coerceWithSchema = coerceWithSchema;
function createClassValidator(schema, className, field) {
    const ajv = new Ajv({ useDefaults: true });
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
    for (const [k, v] of Object.entries(schema.definitions)) {
        ajv.addSchema(v, `#/definitions/${k}`);
    }
    return lodash_1.fromPairs(Object.entries(schema.definitions[className].properties).map(([method, s]) => [
        method, ajv.compile(s.properties[field]),
    ]));
}
exports.createClassValidator = createClassValidator;
function createInterfaceValidator(schema, ifaceName) {
    const ajv = new Ajv({ useDefaults: true });
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
    for (const [k, v] of Object.entries(schema.definitions)) {
        ajv.addSchema(v, `#/definitions/${k}`);
    }
    return ajv.compile(schema.definitions[ifaceName]);
}
exports.createInterfaceValidator = createInterfaceValidator;
//# sourceMappingURL=common.js.map