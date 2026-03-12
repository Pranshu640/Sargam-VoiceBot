import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure .wasm and .onnx files are served correctly
  // and onnxruntime-web is not bundled server-side
  serverExternalPackages: ["onnxruntime-web"],
};

export default nextConfig;
