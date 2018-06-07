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

  auth: {
    params: {
      name: string;
    };
    returns: User;
  };

  greet: {
    params: {
      user: User;
    };
    returns: string;
  };

  getTimeOfDay: {
    params: {
    };
    returns: Date;
  };
}
