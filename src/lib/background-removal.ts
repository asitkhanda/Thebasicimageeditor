import type { Config } from "@imgly/background-removal";

export type BgRemovalProgress = {
  phase: "download" | "processing";
  step: string;
  percent: number;
};

const COMPUTE_STEPS: Record<string, string> = {
  "compute:decode": "Preparing image…",
  "compute:inference": "Detecting subject…",
  "compute:mask": "Refining edges…",
  "compute:encode": "Building result…",
};

function configureOrtEnvironment() {
  if (typeof window === "undefined" || window.crossOriginIsolated) return;

  // Without cross-origin isolation, multi-threaded WASM fails. Fall back to
  // single-thread mode so background removal still works (just slower).
  // @ts-expect-error onnxruntime-web global
  window.ort = window.ort ?? {};
  // @ts-expect-error onnxruntime-web global
  window.ort.env = window.ort.env ?? {};
  // @ts-expect-error onnxruntime-web global
  window.ort.env.wasm = window.ort.env.wasm ?? {};
  // @ts-expect-error onnxruntime-web global
  window.ort.env.wasm.numThreads = 1;
}

function createProgressHandler(
  onProgress?: (progress: BgRemovalProgress) => void,
): Config["progress"] {
  if (!onProgress) return undefined;

  return (key: string, current: number, total: number) => {
    const percent =
      total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

    if (key.startsWith("fetch:")) {
      onProgress({
        phase: "download",
        step: "Downloading AI models (cached after first use)…",
        percent,
      });
      return;
    }

    onProgress({
      phase: "processing",
      step: COMPUTE_STEPS[key] ?? "Processing…",
      percent,
    });
  };
}

function createConfig(onProgress?: (progress: BgRemovalProgress) => void): Config {
  return {
    device: "gpu",
    proxyToWorker: true,
    model: "isnet_fp16",
    output: {
      format: "image/png",
      quality: 0.92,
    },
    progress: createProgressHandler(onProgress),
  };
}

let preloadPromise: Promise<void> | null = null;

export function preloadBackgroundRemoval(
  onProgress?: (progress: BgRemovalProgress) => void,
): Promise<void> {
  configureOrtEnvironment();

  if (!preloadPromise) {
    preloadPromise = import("@imgly/background-removal")
      .then(({ preload }) => preload(createConfig(onProgress)))
      .catch((error) => {
        preloadPromise = null;
        throw error;
      });
  } else if (onProgress) {
    onProgress({
      phase: "download",
      step: "AI models ready",
      percent: 100,
    });
  }

  return preloadPromise;
}

export async function removeImageBackground(
  imageSrc: string,
  onProgress?: (progress: BgRemovalProgress) => void,
): Promise<string> {
  configureOrtEnvironment();

  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(imageSrc, createConfig(onProgress));
  return URL.createObjectURL(blob);
}
