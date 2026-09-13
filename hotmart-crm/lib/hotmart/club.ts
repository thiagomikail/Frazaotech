import "server-only";
import { paginar, listar } from "./cliente";

/**
 * Area de membros (Hotmart Club).
 *
 * Este e o unico endpoint que fala de comportamento, nao de dinheiro — e por
 * isso o mais valioso do conjunto: quem cancela para de assistir semanas
 * antes de clicar em cancelar. Sem ele o painel so consegue contar o churn
 * depois que ele aconteceu.
 *
 * Exige `HOTMART_CLUB_SUBDOMAIN` (o subdominio da sua area de membros). Se o
 * seu produto nao usa o Club, esta parte fica desligada e o resto funciona.
 */

export interface AlunoBruto {
  user_id?: string;
  name?: string;
  email?: string;
  role?: string;
  /** Epoch ms do ultimo acesso a area de membros. */
  last_access_date?: number;
  first_access_date?: number;
  engagement?: { progress?: number; completed_lessons?: number; total_lessons?: number };
}

export interface AulaBruta {
  page_id?: string;
  page_name?: string;
  module_id?: string;
  module_name?: string;
  completed?: boolean;
  completion_date?: number;
}

function subdominio(): string | null {
  return process.env.HOTMART_CLUB_SUBDOMAIN?.trim() || null;
}

export function clubAtivo(): boolean {
  return subdominio() !== null;
}

export function listarAlunos() {
  const sub = subdominio();
  if (!sub) throw new Error("HOTMART_CLUB_SUBDOMAIN nao definido — Club desligado.");
  return paginar<AlunoBruto>("/club/api/v1/users", { subdomain: sub });
}

export function aulasDoAluno(userId: string) {
  const sub = subdominio();
  if (!sub) throw new Error("HOTMART_CLUB_SUBDOMAIN nao definido — Club desligado.");
  return listar<AulaBruta>(`/club/api/v1/users/${userId}/lessons`, { subdomain: sub });
}
