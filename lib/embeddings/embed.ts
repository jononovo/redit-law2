let pipeline: any = null;
let loadingPromise: Promise<any> | null = null;

async function getEmbedder() {
  if (pipeline) return pipeline;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const { pipeline: createPipeline } = await import("@xenova/transformers");
    pipeline = await createPipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { quantized: true },
    );
    return pipeline;
  })();

  pipeline = await loadingPromise;
  loadingPromise = null;
  return pipeline;
}

export async function embed(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const result = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(result.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embed(text));
  }
  return results;
}
