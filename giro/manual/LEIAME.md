# Manual do Giro

O manual é uma página única, gerada a partir de capturas reais do app.

```
manual/
  manual.template.html   fonte do manual (é aqui que se escreve)
  telas/                 capturas em PNG 2x — a fonte das imagens
  web/                   WebP derivado, no tamanho de exibição  (gerado)
  manual.html            página final, com imagens e vídeos embutidos (gerado)
  video/                 projeto Remotion dos quatro clipes
```

## Regerar tudo

Precisa do app no ar. Para as telas do consultor e do diagnóstico saírem
preenchidas, aponte o app para uma IA — a de verdade ou o espelho local:

```bash
npm run db:semear                       # dados de demonstração consistentes
node scripts/espelho-ia.mjs 4545 &      # ou use sua OPENROUTER_API_KEY
OPENROUTER_URL=http://127.0.0.1:4545/chat/completions \
OPENROUTER_API_KEY=espelho npm run start &

npm run manual        # captura, converte e monta manual/manual.html
npm run manual:olhar  # confere o resultado nos dois temas e no celular
```

⚠️ Sempre rode `npm run db:semear` antes de capturar. Sem isso a conversa do
consultor acumula perguntas de execuções anteriores e a captura sai com dois
diálogos na tela.

## Vídeos

```bash
npm run manual:video   # instala, copia as capturas e renderiza os 4 clipes
npm run manual:montar  # remonta o manual já com os vídeos
```

Os clipes saem em `manual/video/saida/*.mp4`, 960×540, 20–25 s, sem áudio.
As composições são 1280×720 (`manual/video/src/Root.tsx`); o render aplica
`scale: 0.75` porque o manual mostra os clipes numa coluna estreita e a página
não pode pesar 20 MB.

Enquadramento é **centro + aproximação**, não retângulo: `{ cx, cy, z }`, com
`z = 1` mostrando a captura inteira. Nas telas de 1280px, `z = 1,5` mostra
cerca de 1030px de largura da página, `z = 2` cerca de 775px. Acima de 2,5
começa a cortar texto.

## Limitações deste ambiente

O Chromium do container não decodifica H.264 e o ffmpeg que vem com o
Playwright é uma build reduzida — nenhum dos dois abre os MP4 gerados. Para
conferir o resultado, use:

- `node manual/video/quadros.mjs <clipe> <frame...>` — renderiza quadros soltos
  direto da composição, sem passar por vídeo;
- `getVideoMetadata` do `@remotion/renderer`, que valida codec, duração e
  dimensões do arquivo pronto.

## Antes de mandar para um cliente

As capturas atuais foram feitas com o consultor apontado para o espelho local,
então a tela de diagnóstico mostra `espelho/local` no lugar do nome do modelo.
O manual declara isso abertamente. Para trocar, rode a captura com uma
`OPENROUTER_API_KEY` de verdade e remonte.
