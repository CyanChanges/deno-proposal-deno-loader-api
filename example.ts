/// <reference path="./deno.loader.d.ts" />
import { assertEquals } from "jsr:@std/assert";

const loader = Deno.loader;

const oldModule = await import("./fixed.ts");

console.log("before", oldModule.getImportTime());

const resolved = loader.resolve("./fixed.ts")!;
assertEquals(resolved, import.meta.resolve(resolved));

const ref = loader.get(resolved);

assertEquals(ref.exports(), oldModule);
assertEquals(ref.requests()[0].specifier, loader.resolve("./date.ts"));

loader.set(
  import.meta.resolve("./date.ts"),
  await loader.import("./fakeDate.ts"),
);
loader.unlink(resolved);

const newModule = await import("./fixed.ts");

console.log("after", newModule.getImportTime());
