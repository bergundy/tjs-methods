export interface User {
  name: string;
  createdAt: Date;
}

export class Example {
  // Public methods are published as functions
  /**
   * Add 2 numbers
   *
   * @param a
   * @minimum 0
   * @bn-type integer
   *
   * @param b
   * @minimum 0
   * @bn-type integer
   *
   * @returns
   * @bn-type integer
   */
  public add(a: number, b: number): number {
    return a + b;
  }

  public getTimeOfDay(): Date {
    return new Date();
  }

  public async hello(user: User): Promise<string> {
    return `Hello, ${user.name}`;
  }

  public async auth(name: string): Promise<User> {
    return { name, createdAt: new Date() };
  }
}
