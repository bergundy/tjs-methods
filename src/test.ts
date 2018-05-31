import { expect } from 'chai';
import 'mocha';
import { transform, typeToString, findRefs } from './generate';

describe('findRefs', () => {
  it('finds all reffed types', () => {
    const result = findRefs({
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
    expect(result).to.eql(['#/definitions/X', '#/definitions/Y', '#/definitions/Z']);
  });
});

describe('typeToString', () => {
  it('transforms integer to number', () => {
    const result = typeToString('integer');
    expect(result).to.equal('number');
  });

  it('passes through a string type', () => {
    const result = typeToString('string');
    expect(result).to.equal('string');
  });

  it('transforms ref into class name', () => {
    const result = typeToString({ $ref: 'Date' });
    expect(result).to.equal('Date');
  });
});

describe('transform', () => {
  it('transforms a simple class with single method', () => {
    const result = transform({
      definitions: {
        Test: {
          properties: {
            add: {
              type: 'method',
              parameters: [
                {
                  name: 'a',
                  type: 'integer',
                },
                {
                  name: 'b',
                  type: 'integer',
                },
              ],
              returnType: 'integer',
            },
          },
        },
      },
    });
    expect(result).to.eql({
      classes: [
        {
          name: 'Test',
          methods: [
            {
              name: 'add',
              parameters: [
                {
                  name: 'a',
                  type: 'number',
                  last: false,
                },
                {
                  name: 'b',
                  type: 'number',
                  last: true,
                },
              ],
              returnType: 'number',
            },
          ],
        },
      ],
    });
  });

  it('sorts output class by checking references', () => {
    const result = transform({
      definitions: {
        A: {
          properties: {
            foo: {
              type: 'method',
              parameters: [
                {
                  name: 'b',
                  type: {
                    $ref: '#/definitions/B',
                  },
                },
              ],
              returnType: 'string',
            },
          },
        },
        B: {
          properties: {
            bar: {
              type: 'method',
              parameters: [
                {
                  name: 'c',
                  type: {
                    $ref: '#/definitions/C',
                  },
                },
              ],
              returnType: 'string',
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
    expect(result.classes.map(({ name }) => name)).to.eql(['C', 'B', 'A']);
  });
});
