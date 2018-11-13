export interface Package {
  dependencies: {
    [name: string]: string;
  };
  devDependencies: {
    [name: string]: string;
  };
  optionalDependencies?: {
    [name: string]: string;
  };
}

export interface GeneratedCode {
  pkg: Package;
  code: {
    [name: string]: string;
  };
}

export enum Role {
  ALL = 'all',
  CLIENT = 'client',
  SERVER = 'server',
}
