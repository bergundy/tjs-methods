import * as stream from 'stream';
import { User } from '../example/interfaces';
import { createReadStream } from 'fs';
import { ExampleServer } from '../example/server';

class Handler {
  public async add(a: number, b: number): Promise<number> {
    return a + b;
  }

  public async auth(name: string): Promise<User> {
    return { name, createdAt: new Date() };
  }

  public async getTimeOfDay(): Promise<Date> {
    return new Date();
  }

  public async greet(user: User): Promise<string> {
    return `Hello, ${user.name} ${user.createdAt.getTime()}`;
  }

  public async upload(name: string, data: stream.Readable): Promise<stream.Readable> {
    return data;
  }
}

const h = new Handler();

const server = new ExampleServer(h);
server.listen(8080).then(() => console.log('Listening on port 8080'));
