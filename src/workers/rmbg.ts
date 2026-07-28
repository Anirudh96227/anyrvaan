/**
 * Background removal.
 *
 *   sleek     ormbg-ONNX        Apache-2.0, IS-Net CNN — small, low memory,
 *                               reliable on phones. The default, on purpose.
 *   accurate  BiRefNet_lite     MIT, transformer-based — better on hair and
 *                               fine edges, and much hungrier for memory.
 *
 * BiRefNet only ships model.onnx and model_fp16.onnx, so it cannot be asked
 * for a q8 dtype; the quantised tiers simply do not exist in that repo. It can
 * also run out of memory on a big image on a modest device, and when it does
 * the honest thing is to finish the job on the smaller model rather than hand
 * back an error — so an allocation failure silently retries on ormbg and says
 * so afterwards.
 */

import { pipeline, RawImage } from '@huggingface/transformers';
import { pickDevice, post, fail, isOOM } from './_shared';

const SLEEK = 'onnx-community/ormbg-ONNX';
const ACCURATE = 'onnx-community/BiRefNet_lite-ONNX';

let pipe: any = null;
let loadedAs = '';

async function build(tier: 'sleek' | 'accurate') {
	const device = await pickDevice();
	const model = tier === 'accurate' ? ACCURATE : SLEEK;
	// BiRefNet has no quantised build; ormbg does and q8 is plenty for it.
	const dtype = tier === 'accurate' ? (device === 'webgpu' ? 'fp16' : 'fp32') : 'q8';

	pipe = await pipeline('background-removal', model, {
		device,
		dtype,
		progress_callback: (p: any) => post({ type: 'progress', p }),
	} as any);
	loadedAs = tier;
	post({ type: 'ready', device, tier });
}

async function ensure(tier: 'sleek' | 'accurate') {
	if (pipe && loadedAs === tier) return;
	await build(tier);
}

self.onmessage = async (e: MessageEvent) => {
	const m = e.data;
	if (m?.type !== 'run') return;

	const send = (out: any, fellBack: boolean) => {
		const img: RawImage = Array.isArray(out) ? out[0] : out;
		const data = new Uint8ClampedArray(img.data);
		post(
			{
				type: 'result',
				width: img.width,
				height: img.height,
				channels: img.channels,
				data,
				fellBack,
			},
			[data.buffer]
		);
	};

	try {
		await ensure(m.tier);
		post({ type: 'running' });
		const image = await RawImage.fromBlob(m.blob);
		try {
			send(await pipe(image), false);
		} catch (err) {
			if (m.tier !== 'accurate' || !isOOM(err)) throw err;
			// Ran out of room on the big model — finish on the small one.
			pipe = null;
			loadedAs = '';
			await ensure('sleek');
			post({ type: 'running' });
			send(await pipe(await RawImage.fromBlob(m.blob)), true);
		}
	} catch (err) {
		fail(err);
	}
};
