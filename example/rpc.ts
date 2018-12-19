export interface User {
  name: string;
  createdAt: Date;
}

export class AuthenticationError extends Error {}
export class InvalidNameError extends Error {}
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
    throws: AuthenticationError | InvalidNameError,
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

  upload: {
    params: {
      name: string;
      data: Buffer;
    };
    returns: Buffer;
  };
}
