/**
 * Depth Anything V2 Small — the only size of it that is Apache-2.0 and so the
 * only one usable here. Both quality tiers come from the same repo via `dtype`,
 * which means there is no second licence to think about:
 *
 *   sleek     q8   → onnx/model_quantized.onnx   (~13 MB)
 *   accurate  fp32 → onnx/model.onnx             (~100 MB)
 *
 * `q8` is the transformers.js name for the `_quantized` file — there is no
 * `model_q8.onnx` in the repo, and asking for one 404s.
 */

import { pipeline, RawImage } from '@huggingface/transformers';
import { pickDevice, post, fail } from './_shared';

const MODEL = 'onnx-community/depth-anything-v2-small';

let pipe: any = null;
let loadedAs = '';

async function ensure(tier: 'sleek' | 'accurate') {
	const dtype = tier === 'accurate' ? 'fp32' : 'q8';
	if (pipe && loadedAs === dtype) return;

	const device = await pickDevice();
	pipe = await pipeline('depth-estimation', MODEL, {
		device,
		dtype,
		progress_callback: (p: any) => post({ type: 'progress', p }),
	} as any);
	loadedAs = dtype;
	post({ type: 'ready', device, tier });
}

self.onmessage = async (e: MessageEvent) => {
	const m = e.data;
	if (m?.type !== 'run') return;
	try {
		await ensure(m.tier);
		post({ type: 'running' });

		const image = await RawImage.fromBlob(m.blob);
		const out: any = await pipe(image);

		// `depth` is already normalised to a single 0–255 channel, which is what
		// the colormaps want; `predicted_depth` is the raw tensor and is not.
		const d = out.depth;
		const data = new Uint8Array(d.data);
		post(
			{ type: 'result', width: d.width, height: d.height, channels: d.channels, data },
			[data.buffer]
		);
	} catch (err) {
		fail(err);
	}
};
