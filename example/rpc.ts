export interface User {
  name: string;
  createdAt: Date;
}

export type integer = number;

export interface Example {
  add: {
    params: {
      a: integer;
      b: integer;
    };
    returns: integer;
  };

  greet: {
    params: {
      user: User;
    };
    returns: string;
  };
}
