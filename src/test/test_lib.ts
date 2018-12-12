import test from 'ava';
import { expect } from 'chai';
import { pass } from './utils';
import { coerceWithSchema, createClassValidator } from '../lib/common';

const dateSchema = { type: 'string', format: 'date-time' };
const dateString = '2018-01-01T18:00:00.000Z';

test('coerceWithSchema coerces string with date-time format into a Date object', pass, () => {
  const d = coerceWithSchema(dateSchema, dateString);
  expect(d.toISOString()).to.equal(dateString);
});

test('coerceWithSchema decends into array definitions when items is an object', pass, () => {
  const [d] = coerceWithSchema({ type: 'array', items: dateSchema }, [dateString]);
  expect(d.toISOString()).to.equal(dateString);
});

test('coerceWithSchema decends into array definitions when items is an array', pass, () => {
  const [d] = coerceWithSchema({ type: 'array', items: [dateSchema] }, [dateString]);
  expect(d.toISOString()).to.equal(dateString);
});

test('coerceWithSchema decends into object definitions', pass, () => {
  const { d } = coerceWithSchema({ type: 'object', properties: { d: dateSchema } }, { d: dateString });
  expect(d.toISOString()).to.equal(dateString);
});

test('coerceWithSchema resolves refs', pass, () => {
  const d = coerceWithSchema({ $ref: '#/definitions/Date' }, dateString, { definitions: { Date: dateSchema } });
  expect(d.toISOString()).to.equal(dateString);
});

test('coerceWithSchema resolves refs in array when items is an object', pass, () => {
  const [d] = coerceWithSchema({ type: 'array', items: { $ref: '#/definitions/Date' } },
    [dateString], { definitions: { Date: dateSchema } });
  expect(d.toISOString()).to.equal(dateString);
});

test('coerceWithSchema resolves refs in array when items is an array', pass, () => {
  const [d] = coerceWithSchema({ type: 'array', items: [{ $ref: '#/definitions/Date' }] },
    [dateString], { definitions: { Date: dateSchema } });
  expect(d.toISOString()).to.equal(dateString);
});

test('coerceWithSchema resolves refs in object definitions', pass, () => {
  const { d } = coerceWithSchema({ type: 'object', properties: { d: { $ref: '#/definitions/Date' } } },
    { d: dateString }, { definitions: { Date: dateSchema } });
  expect(d.toISOString()).to.equal(dateString);
});

test('createClassValidator creates an ajv ValidateFunction for each method signature in the class', pass, () => {
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

test('createClassValidator resolves refs', pass, () => {
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
