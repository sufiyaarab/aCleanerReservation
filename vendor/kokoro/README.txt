kokoro-js 1.2.1 (Apache-2.0, by hexgrad and Xenova), dist/kokoro.web.js copied unchanged from the npm package.
It runs the free, open Kokoro-82M text-to-speech model in the browser. The model weights
(onnx-community/Kokoro-82M-v1.0-ONNX, about 90 MB at q8) and the voice file download from Hugging Face
the first time, then the browser caches them. The ONNX Runtime WebAssembly files load from cdn.jsdelivr.net.
