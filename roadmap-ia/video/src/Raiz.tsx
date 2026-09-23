import { Composition } from "remotion";
import { Divulgacao, DURACAO } from "./Divulgacao";

export const Raiz = () => (
  <Composition id="Divulgacao" component={Divulgacao} durationInFrames={DURACAO} fps={30} width={1080} height={1920} />
);
