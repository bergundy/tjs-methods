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
    const result = typeToString({ type: 'integer' });
    expect(result).to.equal('number');
  });

  it('passes through a string type', () => {
    const result = typeToString({ type: 'string' });
    expect(result).to.equal('string');
  });

  it('transforms ref into class name', () => {
    const result = typeToString({ $ref: '#/definitions/User' });
    expect(result).to.equal('User');
  });
  it('transforms date-time format into Date', () => {
    const result = typeToString({ type: 'string', format: 'date-time' });
    expect(result).to.equal('Date');
  });
});

describe('transform', () => {
  it('transforms a simple class with single attribute', () => {
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
    const result = transform(schema);
    expect(result).to.eql({
      schema: JSON.stringify(schema),
      classes: [
        {
          name: 'Test',
          attributes: [
            {
              name: 'x',
              type: 'number',
            },
          ],
          methods: [],
        },
      ],
    });
  });

  it('transforms a simple class with single method', () => {
    const schema = {
      definitions: {
        Test: {
          properties: {
            add: {
              method: '',
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
    const result = transform(schema);
    expect(result).to.eql({
      schema: JSON.stringify(schema),
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
    expect(result.classes.map(({ name }) => name)).to.eql(['C', 'B', 'A']);
  });
});
