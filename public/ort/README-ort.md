# onnxruntime-web binaries

These four files are copied verbatim out of `node_modules/onnxruntime-web/dist`
and are served as-is from `/ort/`. `src/workers/_shared.ts` points the runtime
at this directory with `env.backends.onnx.wasm.wasmPaths = '/ort/'`.

## Why they are checked in rather than bundled

Left to the bundler, Rollup emits whichever single `.wasm` it happens to see
referenced and gives it a hashed filename. That turned out to be
`ort-wasm-simd-threaded.asyncify.wasm` — **not** the JSEP binary that WebGPU
needs. So `device: 'webgpu'` worked in dev and 404'd in production, which is
the worst way for this to fail.

## Which ones and why

| File | Used when |
| --- | --- |
| `ort-wasm-simd-threaded.jsep.wasm` | `device: 'webgpu'` — the JSEP backend |
| `ort-wasm-simd-threaded.wasm` | `device: 'wasm'` fallback |
| the matching `.mjs` files | loader glue for each |

The other two binaries onnxruntime ships (`asyncify`, `jspi`) are not copied
because nothing here requests those execution modes. If a future change adds
one, copy it in alongside these.

## Refreshing after an onnxruntime upgrade

Copied from **onnxruntime-web 1.26.0-dev.20260416-b7804b056c**. These are
version-locked to the installed package — a mismatched pair fails with an
unhelpful instantiate error, so re-copy whenever that dependency moves:

```
cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.{wasm,mjs} public/ort/
cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.{wasm,mjs} public/ort/
```

## Size

37 MB on disk. Only one binary is ever fetched by a given browser — WebGPU
machines pull the 25 MB JSEP one, everything else the 12 MB plain one — and it
is cached afterwards. If that is too much to keep in git, the alternative is to
gitignore this folder and add the copy step to a `prebuild` script.
