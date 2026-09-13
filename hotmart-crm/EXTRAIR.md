# Este projeto esta estacionado aqui

`hotmart-crm/` nao pertence ao FrazaoTech (FMEA). Ele foi construido numa
sessao onde a criacao de repositorio novo no GitHub estava bloqueada, e o
container era efemero — codigo nao empurrado seria perdido. Este diretorio e
autocontido: tem o proprio `package.json`, `.gitignore` e `CLAUDE.md`.

Para mover pro repo proprio:

```bash
# 1. crie o repo vazio hotmart-crm no GitHub

# 2. leve a pasta com o historico preservado
git subtree split --prefix=hotmart-crm -b hotmart-crm-extraido
cd /tmp && git clone <url-do-novo-repo> hotmart-crm && cd hotmart-crm
git pull <caminho-do-frazaotech> hotmart-crm-extraido
git push -u origin main

# 3. remova daqui
cd <frazaotech> && git rm -r hotmart-crm && git commit -m "Remove hotmart-crm, movido pra repo proprio"
```

Se o historico nao importar, copiar a pasta pro repo novo e um `git init`
resolve igual.

Apague este arquivo depois da mudanca.
