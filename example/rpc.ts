export interface User {
  name: string;
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

  public async hello(user: User): Promise<string> {
    return `Hello, ${user.name}`;
  }

  public async auth(name: string): Promise<User> {
    return { name };
  }
}
