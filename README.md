# Proposal `Deno.Loader`

Module Loader API Proposal for Deno

## Interface

```ts
export class Loader {
  readonly name: string;

  constructor(name: string);

  // Asynchronously import a module in current loader
  // @param specifier - The specifier to import
  // @returns a promise that resolves to a [`ModuleRef`]
  import(specifier: Loader.Specifier): Promise<Loader.ModuleRef>;

  // List all specifiers of currently loaded modules
  //
  // Doesn't include `ext:` for security reasons.
  specifiers(): Loader.Specifier[];

  // List all currently loaded modules
  //
  // Doesn't include `ext:` for security reasons.
  //
  // @returns a array of specifier and corresponding ModuleRef
  entries(): [Loader.Specifier, Loader.ModuleRef][];

  // Similiar to `import.meta.resolve()`
  // Synchronously query existing cache and may return null if the specifier is never resolved
  //
  // @param specifier - The specifier to resolve
  // @param referrer - The referrer specifier, will be ignored if it's `ext:` `node:` `checkin:` for security reasons.
  resolve(specifier: Loader.Specifier, referrer?: string): string | null;

  // Get a [`ModuleRef`] by specifier
  // @param specifier - The specifier to get
  get(specifier: Loader.Specifier): Loader.ModuleRef;

  // Link a specifier to a module
  // @param specifier - The specifier to set
  // @param module: The target [`ModuleRef`] or [`ModuleId`]
  //
  // @returns old [`ModuleRef`] or the alias target [`Specifier`] if any
  set(
    specifier: Loader.Specifier,
    module: Loader.ModuleRef | Loader.ModuleId,
  ): Loader.ModuleRef | Loader.Specifier | null;

  // unlink specifier
  //
  // @param specifier - The specifier to unlink
  // @returns the old [`ModuleRef`] or the alias target [`Specifier`] if any
  unlink(
    specifier: Loader.Specifier,
  ): Loader.ModuleRef | Loader.Specifier | null;

  // alias a specifier with another name
  // so that `import(name)` will have the same effect of `import(target)`
  //
  // @param target - The target specifier to alias
  // @param name - The name to alias the target specifier with
  alias(target: Loader.Specifier, name: Loader.Specifier): void;
}
```

### Example

Also checkout [example.ts](./example.ts)~

```ts
async function load(name: string) {
  const module = await import(name);
  console.log(`Init module v${module.version}`;
  module.init();
}

Deno.writeFileSync("./plugin-a.ts", `
export const version = 1;
export function init() {
  console.log('loaded', version);
}
`)

await load("plugin-a.ts");
// Init module v1
// loaded 1

await load("plugin-a.ts");
// Init module v1

// version 2 of our plugin
Deno.writeFileSync("./plugin-a.ts", `
export const version = 2;
export function init() {
  console.log('loaded', version);
}
`)

// unlink the specifier, so next time it get imported it will be evaluated again
Deno.loader.unlink(Deno.loader.resolve("plugin-a.ts"));

await load('plugin-a.ts')
// Init module v2
// loaded 2
```
