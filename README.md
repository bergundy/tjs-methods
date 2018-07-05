# launch (working title)

*launch* transforms Typescript interfaces into usable client / server code.

It simplifies the process of writing clients and servers and lets you launch your code faster.
Instead of describing REST APIs, `launch` abstracts away REST and HTTP and gives you a simple typescript interface.

Behind the scenes it uses simple HTTP POST with JSON payload and is validated using JSONSchema.
The heavy lifting is done by [typescript-json-schema](https://github.com/YousefED/typescript-json-schema).

### Usage
1. Create the interface file.

    *`interface.ts`*
    ```typescript
    export interface Example {
      add: {
        params: {
          a: number;
          b: number;
        };
        returns: number;
      };
    }
    ```
1. Compile the schema.
    ```bash
    mkdir -p ./generated && launch interface.ts -o ./generated
    ```
1. Write the server code.

    *`server.ts`*
    ```typescript
    import { ExampleServer } from './generated/server';

    class Handler {
      public async add(a: number, b: number): Promise<number> {
        return a + b;
      }
    }

    const h = new Handler();

    const server = new ExampleServer(h);
    server.listen(8080);
    ```
1. Write the client code.

    *`client.ts`*
    ```typescript
    import { ExampleClient } from './generated/client';

    async function main() {
      const client = new ExampleClient('http://localhost:8080');
      try {
        const x = await client.add(1, 2);
        console.log(x);
      } catch (err) {
        console.error(err);
      }
    }

    main();
    ```
1. Install the dependencies
    ```bash
    cat example/{clientDeps,serverDeps} | sort -u | xargs npm i
    ```
1. Run (make sure `tsconfig.json` is properly configured for node and is present in the current directory)
    ```bash
    tsc
    ./server.js &
    ./client.js
    ```
    Alternatively with `ts-node`:
    ```bash
    ts-node ./server.ts &
    ts-node ./client.ts
    ```


## Advanced usage
### Calling with curl # TODO

### Calling with httpie # TODO

### Object params
Complex nested object types are supported.

`Date` parameter types or return type are validated by JSON schema and cast into back to `Date` objects when deserialized.
```typescript
export interface User {
  name: string;
  createdAt: Date;
}

export interface Example {
  lastSeen: {
    params: {
      u: User;
    };
    returns: Date;
  };
}
```

### Context
Some uses require context to be passed on to handlers (i.e. for authentication / extracting the request IP).
Adding a `Context` interface to the schema will cause the framework to prepend it as the first param to method signatures, servers will accept a function that accepts a request object (depends on the runtime) and returns a context object to be passed to methods.

*`interface.ts`*
```typescript
export interface Context {
  ip: string;
}

export interface Example {
  hello: {
    params: {
      name: string;
    };
    returns: integer;
  };
}
```

*`server.ts`*
```typescript
import * as koa from 'koa';
import { Context } from './generated/interfaces';
import { ExampleServer } from './generated/server';

export class Handler {
  public async extractContext({ ip }: koa.Context): Promise<Context> {
    return { ip };
  }

  public async hello({ ip }: Context, name: string): Promise<string> {
    return `Hello, ${name} from ${ip}!`;
  }
}

const h = new Handler();

const server = new ExampleServer(h);
server.listen(8080);
```

### Generating only client / server
```bash
launch --role client -o ./generated interfaces.ts
launch --role server -o ./generated interfaces.ts
```

### Mounting the app with a different prefix and adding custom middleware
*`server.ts`*
```typescript
// ...
import { ExampleRouter } from './generated/server';

// ... implement Handler class ...
const h = new Handler();
const router = new ExampleRouter(h);
const app = new Koa();

const baseRouter = new Router(); // koa-router
baseRouter.use('/prefix',  router.koaRouter.routes(),  router.koaRouter.allowedMethods());
app.use(baseRouter.routes());
app.use(async function myCustomMiddleware(ctx: koa.Context, next) {
  // ... implement middlware ...
});
// ... app.listen(), etc ...
```


### Exceptions # TODO

### JSON Schema attributes
Use annotations to specify JSON Schema attributes.
```typescript
export interface Example {
  add: {
    params: {
      /**
      * @minmum 0
      */
      a: integer;
      /**
      * @minmum 0
      */
      b: integer;
    };
    returns: integer;
  };
}
```

### Integers
Define `integer` as `number`, it'll be reflected in the generated JSON schema while the generated Typescript code will be typed as `number`.
```typescript
export type integer = number;

export interface Example {
  add: {
    params: {
      a: integer;
      b: integer;
    };
    returns: integer;
  };
}
```

## Comparison to other tools
#### OpenAPI (Swagger)
[OpenAPI](https://www.openapis.org/) provides an easy way to write descriptive REST APIs.
`launch` on the other hand, spares you from even thinking about REST and lets you focus on your buisness logic.

Both projects use JSON Schema for input validation. OpenAPI let's you write pure JSON schema while `launch` interfaces are written in typescript.

#### Protobuf / Thrift
`protobuf` and `thrift` have ATM more efficient serialization.
They both enforce backwards compatibility better with field numbering? (TODO)
In the future we could add binary serialization to `launch` but we default to JSON for readability.

`launch` provides advanced type validation with JSON schema.

`launch` uses [mustache](link-needed) templates which are easy to customize to support any language / framework.
