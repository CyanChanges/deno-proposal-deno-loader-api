# Proposal `Deno.Loader`
m
Module Loader API is been wanted for a long time (https://github.com/denoland/deno/issues/8327).
This Module Loader API enables more precise HMR controlled by the developer, and extra benefits make the runtime easier.

Module Loader API Proposal for Deno

## Interface

### JS

Full JS side definition in [deno.loader.d.ts](./deno.loader.d.ts).

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

### Rust

Proposed in https://github.com/denoland/deno_core/issues/1143

```rs

// get the SymbolicModule for `name`
pub fn get<Q>(
  &self,
  name: &Q,
  requested_module_type: impl AsRef<RequestedModuleType>,
) -> Option<SymbolicModule>
  where
    ModuleName: Borrow<Q>,
    Q: Eq + Hash + ?Sized;

// set the SymbolicModule for `name`
pub fn set(
    &mut self,
    name: ModuleName,
    symbolic_module: SymbolicModule,
    requested_module_type: impl AsRef<RequestedModuleType>,
  ) -> Option<SymbolicModule>;

// set `name` to be import to module namespace with module id of `id`
pub fn set_id(
  &self, 
  requested_module_type: RequestedModuleType,
  name: impl AsRef<str>, 
  id: ModuleId
) -> Option<SymbolicModule>;

// delete so import(`name`) will re-evaluate the module with new ModuleId
pub fn delete_id(
  &self, 
  requested_module_type: impl AsRef<RequestedModuleType>,
  name: impl AsRef<str>, 
  id: ModuleId
) -> Option<SymbolicModule>;

// alias so import(`name`) will have same effect of import(`alias`)
pub fn alias(
  &self, 
  requested_module_type: RequestedModuleType,
  name: impl AsRef<str>, 
  alias: impl AsRef<str>
) -> Option<SymbolicModule>; 

// readonly access specifier -> SymbolicModule map with specified type
pub fn with_map(
  &self,
  requested_module_type: impl AsRef<RequestedModuleType>,
  f: impl FnOnce(Option<&HashMap<ModuleName, SymbolicModule>>),
);

// API visibility changes

// from pub(crate) to pub
pub fn get_name_by_id(&self, id: ModuleId) -> Option<String>;

// from pub(crate) to pub
pub fn get_type_by_module(
  &self,
  global: &v8::Global<v8::Module>,
) -> Option<ModuleType>;

// from pub(crate) to pub
pub fn get_id<Q>(
  &self,
  name: &Q,
  requested_module_type: impl AsRef<RequestedModuleType>,
) -> Option<ModuleId>
  where
    ModuleName: Borrow<Q>,
    Q: Eq + Hash + ?Sized;

// from pub(crate) to pub
// allow you to track module imports
pub fn get_requested_modules(
    &self,
    id: ModuleId,
  ) -> Option<Vec<ModuleRequest>>

// from pub(crate) to pub
pub fn get_name_by_module(
    &self,
    global: &v8::Global<v8::Module>,
  ) -> OptionString>;

// from pub(crate) to pub
// also return &ModuleName instead of String to avoid Clone
pub fn get_name_by_id(&self, id: ModuleId) -> Option<&ModuleName>;
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
  console.log('loaded');
}
`)

await load("plugin-a.ts");
// Init module v1
// loaded

await load("plugin-a.ts");
// Init module v1

// version 2 of our plugin
Deno.writeFileSync("./plugin-a.ts", `
export const version = 2;
export function init() {
  console.log('🎉 loaded v2');
}
`)

// unlink the specifier, so next time it get imported it will be read and evaluate again, rather use the existing cache
Deno.loader.unlink(Deno.loader.resolve("plugin-a.ts"));

await load('plugin-a.ts')
// Init module v2
// 🎉 loaded v2
```
