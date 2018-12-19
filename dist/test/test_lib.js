"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const chai_1 = require("chai");
const utils_1 = require("./utils");
const common_1 = require("../lib/common");
const dateSchema = { type: 'string', format: 'date-time' };
const dateString = '2018-01-01T18:00:00.000Z';
ava_1.default('createClassValidator creates an ajv ValidateFunction for each method signature in the class', utils_1.pass, () => {
    const schema = {
        definitions: {
            Foo: {
                properties: {
                    hello: {
                        properties: {
                            params: {
                                properties: {
                                    name: {
                                        type: 'string',
                                    },
                                },
                                required: ['name'],
                            },
                        },
                    },
                },
            },
        },
    };
    const validators = common_1.createClassValidator(schema, 'Foo', 'params');
    chai_1.expect(validators.hello({ name: 'heh' })).to.be.true;
    chai_1.expect(validators.hello({})).to.be.false;
});
ava_1.default('createClassValidator resolves refs', utils_1.pass, () => {
    const schema = {
        definitions: {
            Bar: {
                type: 'string',
            },
            Foo: {
                properties: {
                    hello: {
                        properties: {
                            params: {
                                properties: {
                                    name: {
                                        $ref: '#/definitions/Bar',
                                    },
                                },
                                required: ['name'],
                            },
                        },
                    },
                },
            },
        },
    };
    const validators = common_1.createClassValidator(schema, 'Foo', 'params');
    chai_1.expect(validators.hello({ name: 'heh' })).to.be.true;
    chai_1.expect(validators.hello({})).to.be.false;
});
//# sourceMappingURL=test_lib.js.map