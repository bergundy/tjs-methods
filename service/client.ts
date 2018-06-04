import { ExampleClient } from './schema';

async function main() {
  const client = new ExampleClient('http://localhost:8080');
  try {
    const x = await client.add(1, 2);
    console.log(x);
    const now = await client.getTimeOfDay();
    console.log(now.getDate());
  } catch (err) {
    console.error(err.message);
  }
}

main();
