"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const Ajv = require("ajv");
class ValidationError extends Error {
    constructor(message, errors) {
        super(message);
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
function createValidator() {
    const ajv = new Ajv({ useDefaults: true, allErrors: true });
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
    ajv.addKeyword('coerce-date', {
        type: 'string',
        modifying: true,
        valid: true,
        compile: (onOrOff, parentSchema) => {
            if (parentSchema.format !== 'date-time') {
                throw new Error('Format should be date-time when using coerce-date');
            }
            return (v, _dataPath, obj, key) => {
                if (obj === undefined || key === undefined) {
                    throw new Error('Cannot coerce a date at root level');
                }
                obj[key] = new Date(v);
                return true;
            };
        },
    });
    return ajv;
}
function createClassValidator(schema, className, field) {
    const ajv = createValidator();
    for (const [k, v] of Object.entries(schema.definitions)) {
        ajv.addSchema(v, `#/definitions/${k}`);
    }
    return lodash_1.fromPairs(Object.entries(schema.definitions[className].properties).map(([method, s]) => [
        method, ajv.compile(s.properties[field]),
    ]));
}
exports.createClassValidator = createClassValidator;
function createReturnTypeValidator(schema, className) {
    const ajv = createValidator();
    for (const [k, v] of Object.entries(schema.definitions)) {
        ajv.addSchema(v, `#/definitions/${k}`);
    }
    return lodash_1.fromPairs(Object.entries(schema.definitions[className].properties).map(([method, s]) => [
        method, ajv.compile({ properties: lodash_1.pick(s.properties, 'returns') }),
    ]));
}
exports.createReturnTypeValidator = createReturnTypeValidator;
function createInterfaceValidator(schema, ifaceName) {
    const ajv = createValidator();
    for (const [k, v] of Object.entries(schema.definitions)) {
        ajv.addSchema(v, `#/definitions/${k}`);
    }
    return ajv.compile(schema.definitions[ifaceName]);
}
exports.createInterfaceValidator = createInterfaceValidator;
//# sourceMappingURL=common.js.map