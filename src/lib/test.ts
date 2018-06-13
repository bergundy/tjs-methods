// tslint:disable:no-unused-expression
import { expect } from 'chai';
import 'mocha';
import { coerceWithSchema, createClassValidator } from './common';

const dateSchema = { type: 'string', format: 'date-time' };
const dateString = '2018-01-01T18:00:00.000Z';

describe('coerceWithSchema', () => {
  it('coerces string with date-time format into a Date object', () => {
    const d = coerceWithSchema(dateSchema, dateString);
    expect(d.toISOString()).to.equal(dateString);
  });

  it('decends into array definitions when items is an object', () => {
    const [d] = coerceWithSchema({ type: 'array', items: dateSchema }, [dateString]);
    expect(d.toISOString()).to.equal(dateString);
  });

  it('decends into array definitions when items is an array', () => {
    const [d] = coerceWithSchema({ type: 'array', items: [dateSchema] }, [dateString]);
    expect(d.toISOString()).to.equal(dateString);
  });

  it('decends into object definitions', () => {
    const { d } = coerceWithSchema({ type: 'object', properties: { d: dateSchema } }, { d: dateString });
    expect(d.toISOString()).to.equal(dateString);
  });

  it('resolves refs', () => {
    const d = coerceWithSchema({ $ref: '#/definitions/Date' }, dateString, { definitions: { Date: dateSchema } });
    expect(d.toISOString()).to.equal(dateString);
  });

  it('resolves refs in array when items is an object', () => {
    const [d] = coerceWithSchema({ type: 'array', items: { $ref: '#/definitions/Date' } },
      [dateString], { definitions: { Date: dateSchema } });
    expect(d.toISOString()).to.equal(dateString);
  });

  it('resolves refs in array when items is an array', () => {
    const [d] = coerceWithSchema({ type: 'array', items: [{ $ref: '#/definitions/Date' }] },
      [dateString], { definitions: { Date: dateSchema } });
    expect(d.toISOString()).to.equal(dateString);
  });

  it('resolves refs in object definitions', () => {
    const { d } = coerceWithSchema({ type: 'object', properties: { d: { $ref: '#/definitions/Date' } } },
      { d: dateString }, { definitions: { Date: dateSchema } });
    expect(d.toISOString()).to.equal(dateString);
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
    const validators = createClassValidator(schema, 'Foo', 'params');
    expect(validators.hello({ name: 'heh' })).to.be.true;
    expect(validators.hello({})).to.be.false;
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
    const validators = createClassValidator(schema, 'Foo', 'params');
    expect(validators.hello({ name: 'heh' })).to.be.true;
    expect(validators.hello({})).to.be.false;
  });
});
