/**
 * Segment Anything, click to cut out.
 *
 * SAM is two models pretending to be one. The vision encoder is the expensive
 * half and depends only on the image; the mask decoder is nearly free and
 * depends on where you clicked. So the encoder runs ONCE per image and its
 * output is kept, and every click after that runs only the decoder.
 *
 * Getting that wrong is the difference between a click costing 15 ms and a
 * click costing several seconds, which is the whole feel of the tool.
 *
 *   sleek     slimsam-77-uniform  ~28 MB, fast, fine for most subjects
 *   accurate  sam-vit-base        ~180 MB, tighter on complex edges
 */

import { SamModel, AutoProcessor, RawImage, Tensor } from '@huggingface/transformers';
import { pickDevice, post, fail } from './_shared';

const SLEEK = 'Xenova/slimsam-77-uniform';
const ACCURATE = 'Xenova/sam-vit-base';

let model: any = null;
let processor: any = null;
let loadedAs = '';

/** Kept between clicks — this is the point of the whole file. */
let imageInputs: any = null;
let embeddings: any = null;

async function ensure(tier: 'sleek' | 'accurate') {
	if (model && loadedAs === tier) return;
	const device = await pickDevice();
	const id = tier === 'accurate' ? ACCURATE : SLEEK;
	const progress_callback = (p: any) => post({ type: 'progress', p });

	model = await SamModel.from_pretrained(id, {
		device,
		dtype: device === 'webgpu' ? 'fp16' : 'q8',
		progress_callback,
	} as any);
	processor = await AutoProcessor.from_pretrained(id, { progress_callback } as any);

	loadedAs = tier;
	// A model swap invalidates any embedding computed by the previous one.
	imageInputs = null;
	embeddings = null;
	post({ type: 'ready', device, tier });
}

self.onmessage = async (e: MessageEvent) => {
	const m = e.data;
	try {
		// ---- stage one: the expensive half, once ----
		if (m?.type === 'embed') {
			await ensure(m.tier);
			post({ type: 'running', what: 'encode' });
			const image = await RawImage.fromBlob(m.blob);
			imageInputs = await processor(image);
			embeddings = await model.get_image_embeddings(imageInputs);
			post({ type: 'embedded', width: image.width, height: image.height });
			return;
		}

		// ---- stage two: the cheap half, per click ----
		if (m?.type === 'decode') {
			if (!embeddings || !imageInputs) return post({ type: 'error', message: 'No image loaded yet.' });

			// Points arrive normalised 0–1 so the UI never has to know what size
			// the processor resized the image to.
			const reshaped = imageInputs.reshaped_input_sizes[0];
			const coords: number[] = [];
			const labels: bigint[] = [];
			for (const p of m.points) {
				coords.push(p.x * reshaped[1], p.y * reshaped[0]);
				labels.push(BigInt(p.label));
			}

			const input_points = new Tensor('float32', coords, [1, 1, m.points.length, 2]);
			const input_labels = new Tensor('int64', labels, [1, 1, m.points.length]);

			const outputs: any = await model({ ...embeddings, input_points, input_labels });
			const masks = await processor.post_process_masks(
				outputs.pred_masks,
				imageInputs.original_sizes,
				imageInputs.reshaped_input_sizes
			);

			// One RawImage whose channel count is the number of candidate masks;
			// the scores say which channel to believe.
			const mask = RawImage.fromTensor(masks[0][0]);
			const data = new Uint8Array(mask.data);
			post(
				{
					type: 'mask',
					width: mask.width,
					height: mask.height,
					channels: mask.channels,
					scores: Array.from(outputs.iou_scores.data as Float32Array),
					data,
				},
				[data.buffer]
			);
			return;
		}

		if (m?.type === 'reset') {
			imageInputs = null;
			embeddings = null;
		}
	} catch (err) {
		fail(err);
	}
};
