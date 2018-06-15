import { format } from 'util';
import { generate } from './index';

const pattern = process.argv[2];
if (!pattern) {
  throw new Error(`Usage: ${process.argv[1]} <pattern>`);
}
generate(pattern)
.then((output) => process.stdout.write(output))
.catch((err) => {
  process.stderr.write(`Failed to compile service:\n${format(err)}\n`);
  process.exit(1);
});
