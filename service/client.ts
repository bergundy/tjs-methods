import { ExampleClient } from './schema';

async function main() {
  const client = new ExampleClient('http://localhost:8080');
  try {
    const x = await client.add(1, 2);
    console.log(x);
    const u = await client.auth('Vova');
    console.log(u);
    const greeting = await client.greet(u);
    console.log(greeting);
    const now = await client.getTimeOfDay();
    console.log(now.getTime());
  } catch (err) {
    console.error(err.message);
  }
}

main();
