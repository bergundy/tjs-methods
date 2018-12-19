import { identity, pick, fromPairs } from 'lodash';
import * as stream from 'stream';
import * as Ajv from 'ajv';
import { IncomingForm } from 'formidable';

export class ValidationError extends Error {
  constructor(message: string, public errors: any) {
    super(message);
  }
}

export interface ClassValidator {
  [method: string]: Ajv.ValidateFunction;
}

export class Pipe extends stream.Duplex {
  private readSize: number = 0;
  private chunks: Buffer[] = [];
  private writeEnded: boolean = false;
  private readEnded: boolean = false;

  public next() {
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

  public _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk);
    this.next();
    callback();
  }

  public _read(size: number): void {
    if (this.readEnded) {
      return;
    }
    this.readSize += size;
    this.next();
  }

  public _final(callback: (error?: Error | null) => void): void {
    this.writeEnded = true;
    this.next();
    callback();
  }
}

export const STREAMS = Symbol('streams');

export function streamToBuffer(data: stream.Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    data.on('data', (chunk) => chunks.push(chunk));
    data.on('end', () => resolve(Buffer.concat(chunks)));
    data.on('error', reject);
  });
}

export function serialize(input: any) {
  const streams: stream.Readable[] = [];

  const body: string = JSON.stringify(input, (k, v) => {
    if (v instanceof stream.Readable) {
      streams.push(v);
      return { $stream: streams.length - 1 };
    }
    return v;
  });
  return { streams, body };
}

export function parseForm(input: any) {
  return new Promise<{ body: any; streams: Record<string, stream.Readable> }>((resolve, reject) => {
    const form = new IncomingForm();
    const streams: Record<string, Pipe> = {};
    form.onPart = async (part) => {
      try {
        if (part.name === 'body') {
          const dup = new Pipe({});
          part.pipe(dup);
          const buffer = await streamToBuffer(dup);
          const body = JSON.parse(buffer.toString());
          resolve({ body, streams });
        } else {
          if (!streams[part.name]) {
            streams[part.name] = new Pipe({});
          }
          part.pipe(streams[part.name]);
        }
      } catch (err) {
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

function createValidator(): Ajv.Ajv {
  const ajv = new Ajv({ useDefaults: true, allErrors: true });
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
  ajv.addKeyword('coerce-stream', {
    type: 'object',
    modifying: true,
    valid: true,
    compile: (onOrOff: boolean, parentSchema: any) => {
      if (onOrOff !== true) {
        return identity;
      }
      return (v: any, _dataPath?: string, obj?: object | any[], key?: string | number, rootData?: object | any[]) => {
        if (obj === undefined || key === undefined) {
          throw new Error('Cannot coerce a stream at root level');
        }
        // TODO: check this
        (obj as any)[key] = (rootData! as any)[STREAMS][v['$stream']];
        return true;
      };
    },
  });
  ajv.addKeyword('coerce-date', {
    type: 'string',
    modifying: true,
    valid: true,
    compile: (onOrOff: boolean, parentSchema: any) => {
      if (parentSchema.format !== 'date-time') {
        throw new Error('Format should be date-time when using coerce-date');
      }
      if (onOrOff !== true) {
        return identity;
      }
      return (v: any, _dataPath?: string, obj?: object | any[], key?: string | number) => {
        if (obj === undefined || key === undefined) {
          throw new Error('Cannot coerce a date at root level');
        }
        (obj as any)[key] = new Date(v);
        return true;
      };
    },
  });
  return ajv;
}

export function createClassValidator(schema: { definitions: any }, className: string, field: string): ClassValidator {
  const ajv = createValidator();
  for (const [k, v] of Object.entries(schema.definitions)) {
    ajv.addSchema(v, `#/definitions/${k}`);
  }
  return fromPairs(Object.entries(schema.definitions[className].properties).map(([method, s]) => [
    method, ajv.compile((s as any).properties[field]),
  ]));
}

export function createReturnTypeValidator(schema: { definitions: any }, className: string): ClassValidator {
  const ajv = createValidator();
  for (const [k, v] of Object.entries(schema.definitions)) {
    ajv.addSchema(v, `#/definitions/${k}`);
  }
  return fromPairs(Object.entries(schema.definitions[className].properties).map(([method, s]) => [
    method, ajv.compile({ properties: pick((s as any).properties, 'returns') }),
  ]));
}

export function createInterfaceValidator(schema: { definitions: any }, ifaceName: string): Ajv.ValidateFunction {
  const ajv = createValidator();
  for (const [k, v] of Object.entries(schema.definitions)) {
    ajv.addSchema(v, `#/definitions/${k}`);
  }
  return ajv.compile(schema.definitions[ifaceName]);
}
