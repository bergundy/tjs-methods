"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-unused-expression
const chai_1 = require("chai");
require("mocha");
const common_1 = require("./common");
const dateSchema = { type: 'string', format: 'date-time' };
const dateString = '2018-01-01T18:00:00.000Z';
describe('coerceWithSchema', () => {
    it('coerces string with date-time format into a Date object', () => {
        const d = common_1.coerceWithSchema(dateSchema, dateString);
        chai_1.expect(d.toISOString()).to.equal(dateString);
    });
    it('decends into array definitions when items is an object', () => {
        const [d] = common_1.coerceWithSchema({ type: 'array', items: dateSchema }, [dateString]);
        chai_1.expect(d.toISOString()).to.equal(dateString);
    });
    it('decends into array definitions when items is an array', () => {
        const [d] = common_1.coerceWithSchema({ type: 'array', items: [dateSchema] }, [dateString]);
        chai_1.expect(d.toISOString()).to.equal(dateString);
    });
    it('decends into object definitions', () => {
        const { d } = common_1.coerceWithSchema({ type: 'object', properties: { d: dateSchema } }, { d: dateString });
        chai_1.expect(d.toISOString()).to.equal(dateString);
    });
    it('resolves refs', () => {
        const d = common_1.coerceWithSchema({ $ref: '#/definitions/Date' }, dateString, { definitions: { Date: dateSchema } });
        chai_1.expect(d.toISOString()).to.equal(dateString);
    });
    it('resolves refs in array when items is an object', () => {
        const [d] = common_1.coerceWithSchema({ type: 'array', items: { $ref: '#/definitions/Date' } }, [dateString], { definitions: { Date: dateSchema } });
        chai_1.expect(d.toISOString()).to.equal(dateString);
    });
    it('resolves refs in array when items is an array', () => {
        const [d] = common_1.coerceWithSchema({ type: 'array', items: [{ $ref: '#/definitions/Date' }] }, [dateString], { definitions: { Date: dateSchema } });
        chai_1.expect(d.toISOString()).to.equal(dateString);
    });
    it('resolves refs in object definitions', () => {
        const { d } = common_1.coerceWithSchema({ type: 'object', properties: { d: { $ref: '#/definitions/Date' } } }, { d: dateString }, { definitions: { Date: dateSchema } });
        chai_1.expect(d.toISOString()).to.equal(dateString);
    });
});
describe('createClassValidator', () => {
    it('creates an ajv ValidateFunction for each method signature in the class', () => {
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
    it('resolves refs', () => {
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
});
//# sourceMappingURL=test.js.map