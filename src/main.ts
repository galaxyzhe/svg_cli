import { pathToFileURL } from "node:url";

export function main(): void {
  process.stdout.write("svg-editor scaffold\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}