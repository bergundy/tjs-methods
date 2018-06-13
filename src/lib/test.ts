import { expect } from 'chai';
import 'mocha';
import { coerceWithSchema } from './common';

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
