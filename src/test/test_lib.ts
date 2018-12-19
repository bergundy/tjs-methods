import test from 'ava';
import { expect } from 'chai';
import { pass } from './utils';
import { createClassValidator } from '../lib/common';

const dateSchema = { type: 'string', format: 'date-time' };
const dateString = '2018-01-01T18:00:00.000Z';

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
