# Vídeo de divulgação (Remotion)

Reels 1080×1920, 29 s, sem narração (Reels roda mudo na maioria das vezes).
O último render está em `entrega/divulgacao.mp4` (+ `entrega/capa.png`).

```bash
npm install
npm run studio     # editar com preview
npm run render     # gera out/divulgacao.mp4
```

Roteiro (`src/Divulgacao.tsx`), na ordem do próprio relatório — resposta primeiro:

1. **Gancho** — "IA não serve pra tudo."
2. **Por quê** — hora fora do gargalo não vira dinheiro; mais lead pra quem não dá conta piora.
3. **Perguntas** — 22 perguntas, 12 minutos (tela do questionário).
4. **Gargalo** — ranking das 7 frentes, a primeira em ouro.
5. **E-mail** — o relatório chegando: veredito, onde vale, o que não fazer, roadmap.
6. **Chamada** — sem cadastro, chega no e-mail, link na bio.

A fonte (Montserrat, OFL) está embutida em `public/fonts` — o render não depende de rede.
Em ambiente sem Chrome do Remotion, passe `--browser-executable=<chromium>`.
