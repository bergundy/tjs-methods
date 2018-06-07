import { User, ExampleServer } from './schema';

class Handler {
  public async add(a: number, b: number): Promise<number> {
    return a + b;
  }

  public async auth(name: string): Promise<User> {
    return { name, createdAt: new Date().toString() };
  }

  public async getTimeOfDay(): Promise<Date> {
    return new Date();
  }

  public async greet(user: User): Promise<string> {
    return `Hello, ${user.name} ${user.createdAt.getTime()}`;
  }
}

const h = new Handler();

const server = new ExampleServer(h);
server.listen(8080);
