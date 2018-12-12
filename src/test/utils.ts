export async function pass(t, fn) {
  await fn();
  t.pass();
}
