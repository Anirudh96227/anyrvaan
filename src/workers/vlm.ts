/**
 * SmolVLM — an image in, a description out.
 *
 *   quick     SmolVLM-256M-Instruct
 *   detailed  SmolVLM-500M-Instruct
 *
 * The model is three ONNX modules rather than one, and they want different
 * precisions: the token embedding stays fp16 because quantising it costs more
 * quality than it saves bytes, while the vision encoder and the decoder are
 * fine at q4. On WASM everything drops to q8, since fp16 has no advantage
 * there and q4 is slow to unpack.
 *
 * Generation is deliberately greedy — `do_sample: false`. A prompt describing
 * an image should come out the same twice running, or the Regenerate button
 * becomes a slot machine.
 */

import { AutoProcessor, AutoModelForVision2Seq, RawImage } from '@huggingface/transformers';
import { pickDevice, post, fail } from './_shared';

const QUICK = 'HuggingFaceTB/SmolVLM-256M-Instruct';
const DETAILED = 'HuggingFaceTB/SmolVLM-500M-Instruct';

let model: any = null;
let processor: any = null;
let loadedAs = '';

async function ensure(tier: 'sleek' | 'accurate') {
	if (model && loadedAs === tier) return;
	const device = await pickDevice();
	const id = tier === 'accurate' ? DETAILED : QUICK;
	const progress_callback = (p: any) => post({ type: 'progress', p });

	const dtype =
		device === 'webgpu'
			? { embed_tokens: 'fp16', vision_encoder: 'q4', decoder_model_merged: 'q4' }
			: { embed_tokens: 'q8', vision_encoder: 'q8', decoder_model_merged: 'q8' };

	processor = await AutoProcessor.from_pretrained(id, { progress_callback } as any);
	model = await AutoModelForVision2Seq.from_pretrained(id, {
		device,
		dtype,
		progress_callback,
	} as any);

	loadedAs = tier;
	post({ type: 'ready', device, tier });
}

self.onmessage = async (e: MessageEvent) => {
	const m = e.data;
	if (m?.type !== 'run') return;
	try {
		await ensure(m.tier);
		post({ type: 'running' });

		const image = await RawImage.fromBlob(m.blob);
		const messages = [
			{ role: 'user', content: [{ type: 'image' }, { type: 'text', text: m.prompt }] },
		];
		const text = processor.apply_chat_template(messages, { add_generation_prompt: true });

		// Splitting tiles a large image into sub-images for extra detail. At
		// these model sizes it mostly buys latency, so it stays off.
		const inputs = await processor(text, [image], { do_image_splitting: false });

		const generated = await model.generate({
			...inputs,
			max_new_tokens: m.maxTokens ?? 320,
			do_sample: false,
		});

		// Trim the prompt back off — generate() returns it followed by the answer.
		const trimmed = (generated as any).slice(null, [inputs.input_ids.dims.at(-1), null]);
		const decoded: string[] = processor.batch_decode(trimmed, { skip_special_tokens: true });

		post({ type: 'result', style: m.style, text: (decoded[0] ?? '').trim() });
	} catch (err) {
		fail(err);
	}
};
