import { Config } from "@remotion/cli/config";

// O container ja traz um Chromium (o do Playwright). Sem isto o Remotion
// tentaria baixar o proprio, e a rede pode nao permitir.
const navegador =
  process.env.REMOTION_CHROMIUM ??
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

Config.setBrowserExecutable(navegador);
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.overrideWebpackConfig((c) => c);
