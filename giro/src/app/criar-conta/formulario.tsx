"use client";

import { useActionState } from "react";
import { criarConta, type EstadoFormulario } from "@/acoes/conta";
import { BotaoEnviar } from "@/componentes/botao-enviar";

export function FormularioCadastro() {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(criarConta, undefined);

  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="nome">
          Seu nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={estado?.campos?.nome}
          className="campo"
          placeholder="Thiago"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="empresa">
            Nome da empresa
          </label>
          <input
            id="empresa"
            name="empresa"
            required
            defaultValue={estado?.campos?.empresa}
            className="campo"
            placeholder="Padaria São Jorge"
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="segmento">
            Ramo
          </label>
          <input
            id="segmento"
            name="segmento"
            required
            defaultValue={estado?.campos?.segmento}
            className="campo"
            placeholder="padaria"
          />
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado?.campos?.email}
          className="campo"
          placeholder="você@suaempresa.com.br"
        />
      </div>

      <div>
        <label className="rotulo" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="campo"
          placeholder="pelo menos 8 caracteres"
        />
      </div>

      {estado?.erro ? (
        <p className="rounded-lg bg-sangue-clara px-3 py-2 text-sm text-sangue">{estado.erro}</p>
      ) : null}

      <BotaoEnviar carregando="Criando...">Criar conta</BotaoEnviar>
    </form>
  );
}
