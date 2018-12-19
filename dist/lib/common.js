"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const stream = require("stream");
const Ajv = require("ajv");
const formidable_1 = require("formidable");
class ValidationError extends Error {
    constructor(message, errors) {
        super(message);
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
class Pipe extends stream.Duplex {
    constructor() {
        super(...arguments);
        this.readSize = 0;
        this.chunks = [];
        this.writeEnded = false;
        this.readEnded = false;
    }
    next() {
        if (this.readSize > 0 && this.chunks.length > 0) {
            const buff = Buffer.concat(this.chunks);
            const readSize = Math.min(this.readSize, buff.length);
            const [toRead, rest] = [buff.slice(0, readSize), buff.slice(readSize)];
            this.chunks = rest.length === 0 ? [] : [rest];
            this.readSize -= readSize;
            this.push(toRead);
        }
        if (this.writeEnded && this.chunks.length === 0) {
            this.readEnded = true;
            this.push(null);
        }
    }
    _write(chunk, encoding, callback) {
        this.chunks.push(chunk);
        this.next();
        callback();
    }
    _read(size) {
        if (this.readEnded) {
            return;
        }
        this.readSize += size;
        this.next();
    }
    _final(callback) {
        this.writeEnded = true;
        this.next();
        callback();
    }
}
exports.Pipe = Pipe;
exports.STREAMS = Symbol('streams');
function streamToBuffer(data) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        data.on('data', (chunk) => chunks.push(chunk));
        data.on('end', () => resolve(Buffer.concat(chunks)));
        data.on('error', reject);
    });
}
exports.streamToBuffer = streamToBuffer;
function serialize(input) {
    const streams = [];
    const body = JSON.stringify(input, (k, v) => {
        if (v instanceof stream.Readable) {
            streams.push(v);
            return { $stream: streams.length - 1 };
        }
        return v;
    });
    return { streams, body };
}
exports.serialize = serialize;
function parseForm(input) {
    return new Promise((resolve, reject) => {
        const form = new formidable_1.IncomingForm();
        const streams = {};
        form.onPart = async (part) => {
            try {
                if (part.name === 'body') {
                    const dup = new Pipe({});
                    part.pipe(dup);
                    const buffer = await streamToBuffer(dup);
                    const body = JSON.parse(buffer.toString());
                    resolve({ body, streams });
                }
                else {
                    if (!streams[part.name]) {
                        streams[part.name] = new Pipe({});
                    }
                    part.pipe(streams[part.name]);
                }
            }
            catch (err) {
                reject(err);
            }
        };
        form.parse(input, (err) => {
            if (err) {
                reject(err);
            }
        });
    });
}
exports.parseForm = parseForm;
function createValidator() {
    const ajv = new Ajv({ useDefaults: true, allErrors: true });
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
    ajv.addKeyword('coerce-stream', {
        type: 'object',
        modifying: true,
        valid: true,
        compile: (onOrOff, parentSchema) => {
            if (onOrOff !== true) {
                return lodash_1.identity;
            }
            return (v, _dataPath, obj, key, rootData) => {
                if (obj === undefined || key === undefined) {
                    throw new Error('Cannot coerce a stream at root level');
                }
                // TODO: check this
                obj[key] = rootData[exports.STREAMS][v['$stream']];
                return true;
            };
        },
    });
    ajv.addKeyword('coerce-date', {
        type: 'string',
        modifying: true,
        valid: true,
        compile: (onOrOff, parentSchema) => {
            if (parentSchema.format !== 'date-time') {
                throw new Error('Format should be date-time when using coerce-date');
            }
            if (onOrOff !== true) {
                return lodash_1.identity;
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