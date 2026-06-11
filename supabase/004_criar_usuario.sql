-- 004 — Criar usuário do app BT Performance (TEMPLATE — editar os valores e rodar)
-- =============================================================================
-- POR QUE ISSO EXISTE: o app não tem tela de cadastro por decisão da fase
-- Laboratório (acesso é criado pelo treinador, não self-service — V2/Fase 3).
-- O projeto Supabase é COMPARTILHADO com o BeachFlow, então o signup público
-- do projeto fica aberto (desligar quebraria o BeachFlow); quem protege os
-- dados do BT é o RLS (testado: usuário sem vínculo vê 0 atletas / 0 dados).
--
-- COMO USAR: substituir os valores em 🔧, colar no SQL Editor do projeto
-- btjsweysefmbceqqlyxx (ou rodar via `supabase db query --linked` no repo da
-- Copa). Rodar UM bloco por usuário.
-- =============================================================================

-- ── BLOCO A: criar ATLETA (auth + perfil + ficha, já vinculado ao treinador) ──
do $$
declare
  v_uid    uuid := gen_random_uuid();
  v_email  text := 'fulano@exemplo.com';            -- 🔧 e-mail do atleta
  v_senha  text := 'trocar-esta-senha';             -- 🔧 senha inicial (atleta troca depois)
  v_nome   text := 'Fulano da Silva';               -- 🔧 nome completo
  v_slug   text := 'fulano-silva';                  -- 🔧 atleta_id (slug, igual ao da planilha!)
  v_trein  uuid := '00000000-0000-4000-8000-000000000001'; -- 🔧 user_id do treinador dono
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
          v_email, extensions.crypt(v_senha, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now());

  insert into auth.identities (id, user_id, identity_data, provider, provider_id,
                               last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid,
          jsonb_build_object('sub', v_uid::text, 'email', v_email),
          'email', v_uid::text, now(), now(), now());

  insert into bt_perfis (user_id, papel, nome, atleta_id)
  values (v_uid, 'atleta', v_nome, v_slug);

  insert into bt_atletas (atleta_id, treinador_id, nome, status)
  values (v_slug, v_trein, v_nome, 'ativo')
  on conflict (atleta_id) do update set treinador_id = excluded.treinador_id;

  raise notice 'Atleta criado: % (user_id %)', v_email, v_uid;
end $$;

-- ── BLOCO B: criar TREINADOR (auth + perfil; sem ficha de atleta) ─────────────
-- Igual ao bloco A, trocando o insert de bt_perfis por papel='treinador' e
-- atleta_id=null, e removendo o insert em bt_atletas.

-- ── BLOCO C: limpeza pendente (2026-06-11) ───────────────────────────────────
-- O teste de segurança do signup criou um usuário descartável que ainda existe.
-- Rodar uma vez:
-- delete from auth.identities where user_id = 'c398468d-eb0a-4a40-bb97-e3c39072022a';
-- delete from auth.users      where id      = 'c398468d-eb0a-4a40-bb97-e3c39072022a';

-- ── NOTAS ─────────────────────────────────────────────────────────────────────
-- · user_id do treinador atual (Rafael, teste): 00000000-0000-4000-8000-000000000001
-- · O atleta_id (slug) DEVE ser o mesmo usado nos CSVs/planilha — é a chave que
--   liga app e lab.
-- · Senha: orientar troca no primeiro acesso (recurso de troca de senha é
--   pendência do app; até lá, usar senha forte única por atleta).
-- · Remover usuários de teste (rafael/joao/intruso) quando entrar atleta real.
