import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O repositorio tem outro package-lock.json na raiz (o app de FMEA). Sem
  // isto o Next escolhe a raiz errada como workspace e avisa em todo build.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
