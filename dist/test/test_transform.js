"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const chai_1 = require("chai");
const utils_1 = require("./utils");
const transform_1 = require("../transform");
const exceptionSchema = {
    properties: {
        message: {
            type: 'string',
        },
        name: {
            type: 'string',
        },
        stack: {
            type: 'string',
        },
    },
    propertyOrder: [
        'name',
        'message',
        'stack',
    ],
    required: [
        'message',
        'name',
    ],
    type: 'object',
};
ava_1.default('findRefs finds all reffed types', utils_1.pass, () => {
    const result = transform_1.findRefs({
        properties: {
            x: {
                type: {
                    $ref: '#/definitions/X',
                },
            },
            y: {
                type: 'array',
                items: {
                    type: {
                        $ref: '#/definitions/Y',
                    },
                },
            },
            z: {
                type: 'method',
                parameters: [
                    {
                        name: 'z',
                        type: {
                            $ref: '#/definitions/Z',
                        },
                    },
                ],
                returnType: 'string',
            },
        },
    });
    chai_1.expect(result).to.eql(['#/definitions/X', '#/definitions/Y', '#/definitions/Z']);
});
ava_1.default('typeToString transforms integer to number', utils_1.pass, () => {
    const result = transform_1.typeToString({ type: 'integer' });
    chai_1.expect(result).to.equal('number');
});
ava_1.default('typeToString passes through a string type', utils_1.pass, () => {
    const result = transform_1.typeToString({ type: 'string' });
    chai_1.expect(result).to.equal('string');
});
ava_1.default('typeToString transforms launchType to launchType', utils_1.pass, () => {
    const result = transform_1.typeToString({ type: 'string', launchType: 'LT' });
    chai_1.expect(result).to.equal('LT');
});
ava_1.default('typeToString transforms ref into class name', utils_1.pass, () => {
    const result = transform_1.typeToString({ $ref: '#/definitions/User' });
    chai_1.expect(result).to.equal('User');
});
ava_1.default('typeToString transforms date-time format into Date', utils_1.pass, () => {
    const result = transform_1.typeToString({ type: 'string', format: 'date-time' });
    chai_1.expect(result).to.equal('Date');
});
ava_1.default('typeToString transforms enum into pipe separated string', utils_1.pass, () => {
    const result = transform_1.typeToString({
        type: 'string',
        enum: ['a', 'b'],
    });
    chai_1.expect(result).to.equal('"a" | "b"');
});
ava_1.default('typeToString transforms anyOf into pipe separated string', utils_1.pass, () => {
    const result = transform_1.typeToString({
        anyOf: [
            {
                type: 'string',
            },
            {
                $ref: '#/definitions/User',
            },
        ],
    });
    chai_1.expect(result).to.equal('string | User');
});
ava_1.default('typeToString transforms allOf into ampersand separated string', utils_1.pass, () => {
    const result = transform_1.typeToString({
        allOf: [
            {
                $ref: '#/definitions/User',
            },
            {
                $ref: '#/definitions/Abuser',
            },
        ],
    });
    chai_1.expect(result).to.equal('User & Abuser');
});
ava_1.default('typeToString transforms object into TS interface', utils_1.pass, () => {
    const result = transform_1.typeToString({
        type: 'object',
        properties: {
            user: {
                $ref: '#/definitions/User',
            },
            created: {
                type: 'string',
                format: 'date-time',
            },
        },
        required: ['user'],
    });
    chai_1.expect(result).to.equal('{ user: User; created?: Date; }');
});
ava_1.default('typeToString transforms array with items as object into TS interface', utils_1.pass, () => {
    const result = transform_1.typeToString({
        type: 'array',
        items: {
            $ref: '#/definitions/User',
        },
    });
    chai_1.expect(result).to.equal('User[]');
});
ava_1.default('typeToString transforms array with items as array into TS interface', utils_1.pass, () => {
    const result = transform_1.typeToString({
        type: 'array',
        items: [
            {
                $ref: '#/definitions/User',
            },
            {
                type: 'string',
                format: 'date-time',
            },
        ],
    });
    chai_1.expect(result).to.equal('[User, Date]');
});
ava_1.default('transform transforms a simple class with single attribute', utils_1.pass, () => {
    const schema = {
        definitions: {
            Test: {
                properties: {
                    x: {
                        type: 'number',
                    },
                },
            },
        },
    };
    const result = transform_1.transform(schema);
    chai_1.expect(result).to.eql({
        schema: JSON.stringify(schema),
        exceptions: [],
        classes: [
            {
                name: 'Test',
                attributes: [
                    {
                        name: 'x',
                        type: 'number',
                        optional: true,
                    },
                ],
                methods: [],
            },
        ],
        clientContext: undefined,
        serverOnlyContext: undefined,
        serverContext: undefined,
        enums: [],
        bypassTypes: [],
    });
});
ava_1.default('transform transforms a simple class with single method', utils_1.pass, () => {
    const schema = {
        definitions: {
            Test: {
                properties: {
                    add: {
                        type: 'object',
                        properties: {
                            params: {
                                type: 'object',
                                properties: {
                                    b: {
                                        type: 'integer',
                                    },
                                    a: {
                                        type: 'integer',
                                    },
                                },
                                propertyOrder: ['a', 'b'],
                            },
                            returns: {
                                type: 'integer',
                            },
                        },
                    },
                },
            },
        },
    };
    const result = transform_1.transform(schema);
    chai_1.expect(result).to.eql({
        schema: JSON.stringify(schema),
        exceptions: [],
        classes: [
            {
                name: 'Test',
                attributes: [],
                methods: [
                    {
                        name: 'add',
                        parameters: [
                            {
                                name: 'a',
                                type: 'number',
                                optional: true,
                                last: false,
                            },
                            {
                                name: 'b',
                                type: 'number',
                                optional: true,
                                last: true,
                            },
                        ],
                        returnType: 'number',
                        throws: [],
                    },
                ],
            },
        ],
        clientContext: undefined,
        serverOnlyContext: undefined,
        serverContext: undefined,
        enums: [],
        bypassTypes: [],
    });
});
ava_1.default('transform sorts output class by checking references', utils_1.pass, () => {
    const result = transform_1.transform({
        definitions: {
            A: {
                properties: {
                    foo: {
                        type: 'object',
                        properties: {
                            params: {
                                properties: {
                                    b: {
                                        $ref: '#/definitions/B',
                                    },
                                },
                                propertyOrder: ['b'],
                            },
                            returns: {
                                type: 'string',
                            },
                        },
                    },
                },
            },
            B: {
                properties: {
                    bar: {
                        type: 'object',
                        properties: {
                            params: {
                                properties: {
                                    c: {
                                        $ref: '#/definitions/C',
                                    },
                                },
                                propertyOrder: ['b'],
                            },
                            returns: {
                                type: 'string',
                            },
                        },
                    },
                },
            },
            C: {
                properties: {
                    baz: {
                        type: 'string',
                    },
                },
            },
        },
    });
    chai_1.expect(result.classes.map(({ name }) => name)).to.eql(['C', 'B', 'A']);
});
ava_1.default('transform transforms exceptions', utils_1.pass, () => {
    const schema = {
        definitions: {
            Test: {
                properties: {
                    add: {
                        type: 'object',
                        properties: {
                            params: {
                                type: 'object',
                                properties: {},
                            },
                            returns: {
                                type: 'integer',
                            },
                            throws: {
                                $ref: '#/definitions/RuntimeError',
                            },
                        },
                    },
                },
            },
            RuntimeError: exceptionSchema,
        },
    };
    const result = transform_1.transform(schema);
    chai_1.expect(result).to.eql({
        schema: JSON.stringify(schema),
        exceptions: [
            {
                name: 'RuntimeError',
                attributes: [
                    {
                        name: 'message',
                        type: 'string',
                        optional: false,
                    },
                    {
                        name: 'name',
                        type: 'string',
                        optional: false,
                    },
                    {
                        name: 'stack',
                        type: 'string',
                        optional: true,
                    },
                ],
                methods: [],
            },
        ],
        classes: [
            {
                name: 'Test',
                attributes: [],
                methods: [
                    {
                        name: 'add',
                        parameters: [],
                        returnType: 'number',
                        throws: ['RuntimeError'],
                    },
                ],
            },
        ],
        clientContext: undefined,
        serverOnlyContext: undefined,
        serverContext: undefined,
        enums: [],
        bypassTypes: [],
    });
});
ava_1.default('transform returns a context class when given a Context interface', utils_1.pass, () => {
    const result = transform_1.transform({
        definitions: {
            ClientContext: {
                properties: {
                    foo: {
                        type: 'string',
                    },
                },
                required: ['foo'],
            },
        },
    });
    chai_1.expect(result.clientContext).to.eql({
        name: 'ClientContext',
        attributes: [
            {
                name: 'foo',
                type: 'string',
                optional: false,
            },
        ],
        methods: [],
    });
});
ava_1.default('transform throws when passed non string enum', utils_1.pass, () => {
    chai_1.expect(() => transform_1.transform({
        definitions: {
            OneTwoThree: {
                type: 'number',
                enum: [1, 2, 3],
            },
        },
    })).to.throw('Unsupported enum type definitions found (expected string values only): OneTwoThree');
});
ava_1.default('trasform throws when passed string enum with invalid value', utils_1.pass, () => {
    chai_1.expect(() => transform_1.transform({
        definitions: {
            InvalidStringEnum: {
                type: 'string',
                enum: ['1ss', 'sss'],
            },
        },
    })).to.throw(/^Unsupported enum value found \(does not match .+\): InvalidStringEnum$/);
});
//# sourceMappingURL=test_transform.js.map