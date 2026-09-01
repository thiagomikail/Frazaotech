#!/bin/sh
# Reinicia o app de forma previsivel: derruba o que estiver na 3000, espera a
# porta soltar de verdade e so entao sobe. `pkill` seguido de start imediato
# mata o processo novo junto com o velho.
set -e
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "next start" 2>/dev/null || true
i=0
while curl -s -o /dev/null --max-time 1 http://localhost:3000/ && [ $i -lt 20 ]; do
  sleep 1; i=$((i+1))
done
nohup npm run start > /tmp/giro-servidor.log 2>&1 &
i=0
while [ $i -lt 40 ]; do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000/; then echo "no ar"; exit 0; fi
  sleep 1; i=$((i+1))
done
echo "nao subiu"; tail -20 /tmp/giro-servidor.log; exit 1
