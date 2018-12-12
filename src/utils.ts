import { spawn as origSpawn, SpawnOptions } from 'child_process';

export const spawn = (
  command: string,
  args?: ReadonlyArray<string>,
  options?: SpawnOptions
): Promise<number> => new Promise((resolve, reject) => {
  const child = origSpawn(command, args, options);
  child.on('close', (code: number) => {
    if (code === 0) {
      resolve(code);
    } else {
      const fullCommand = [command].concat(args || []).join(' ');
      reject(new Error(`command: '${fullCommand}' failed process failed with exit code: ${code}`));
    }
  });
  child.on('error', reject);
});
