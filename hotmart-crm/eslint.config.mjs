// eslint-config-next 16 ja exporta flat config: nada de FlatCompat.
import next from "eslint-config-next";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...(Array.isArray(next) ? next : [next]),
  ...(Array.isArray(nextTs) ? nextTs : [nextTs]),
  { ignores: ["lib/generated/**", ".next/**", "node_modules/**"] },
];

export default config;
