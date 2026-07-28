/**
 * Bits every model worker needs.
 *
 * Device choice is done by actually asking for an adapter rather than checking
 * that `navigator.gpu` exists. The object is present in browsers that will
 * still refuse to hand over a GPU — blocklisted drivers, a headless context,
 * Linux without the flag — and the failure then happens deep inside the model
 * load, where it looks like a broken model rather than a missing GPU.
 */

import { env } from '@huggingface/transformers';

/**
 * Serve the onnxruntime binaries from a fixed path we control.
 *
 * Left alone, the bundler emits exactly one of the four .wasm files
 * onnxruntime ships — whichever one it happens to see referenced — and hashes
 * its name. WebGPU needs `ort-wasm-simd-threaded.jsep.wasm`, which is not the
 * one that gets emitted, so `device: 'webgpu'` fails in production looking for
 * a file that was never deployed. It works in dev, which is the worst kind of
 * bug to ship.
 *
 * public/ort/ holds the two backends this code asks for, copied verbatim and
 * untouched by the build, and pointing the runtime at them removes the whole
 * question. See README-ort.md if these ever need refreshing.
 */
if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.wasmPaths = '/ort/';

export type Device = 'webgpu' | 'wasm';

export async function pickDevice(): Promise<Device> {
	const gpu = (navigator as any).gpu;
	if (gpu?.requestAdapter) {
		try {
			const adapter = await gpu.requestAdapter();
			if (adapter) return 'webgpu';
		} catch {
			/* fall through to wasm */
		}
	}
	return 'wasm';
}

export const post = (msg: any, transfer: Transferable[] = []) =>
	(self as any).postMessage(msg, transfer);

export const fail = (err: unknown) =>
	post({ type: 'error', message: err instanceof Error ? err.message : String(err) });

/** Out-of-memory reads differently in every backend; this catches the lot. */
export const isOOM = (err: unknown) => {
	const s = (err instanceof Error ? err.message : String(err)).toLowerCase();
	return (
		s.includes('memory') ||
		s.includes('allocation') ||
		s.includes('alloc') ||
		s.includes('out of range') ||
		s.includes('rangeerror')
	);
};
