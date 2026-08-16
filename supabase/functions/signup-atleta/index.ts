import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

const CONSENT_VERSION = '1.1'
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  try {
    const body = await req.json().catch(() => ({})) as {
      nome?: unknown; email?: unknown; senha?: unknown
      atletaSlug?: unknown; coachEmail?: unknown; consentAceito?: unknown
    }
    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const senha = typeof body.senha === 'string' ? body.senha : ''
    const atletaSlug = typeof body.atletaSlug === 'string' ? body.atletaSlug.trim().toLowerCase() : ''
    const coachEmail = typeof body.coachEmail === 'string' ? body.coachEmail.trim().toLowerCase() : ''
    const consentAceito = body.consentAceito === true

    if (!nome || nome.length < 2) return json({ error: 'Nome inválido.' }, 400)
    if (!EMAIL_RE.test(email)) return json({ error: 'E-mail do atleta inválido.' }, 400)
    if (senha.length < 6) return json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, 400)
    if (!SLUG_RE.test(atletaSlug)) return json({ error: 'O identificador do atleta deve usar apenas letras minúsculas, números e hífen (ex.: joao-silva).' }, 400)
    if (!EMAIL_RE.test(coachEmail)) return json({ error: 'Código de convite (e-mail do treinador) inválido.' }, 400)
    if (!consentAceito) return json({ error: 'É preciso aceitar o termo de consentimento para continuar.' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!serviceKey) return json({ error: 'Cadastro ainda não configurado pelo administrador' }, 503)
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

    // 1) resolve o treinador pelo "código de convite" (e-mail dele) — nunca
    // deixa o autocadastro escolher/adivinhar treinador sozinho.
    let coachUserId: string | null = null
    {
      let page = 1
      while (!coachUserId) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
        if (error) return json({ error: 'Falha ao validar o código de convite.' }, 500)
        const match = data.users.find(u => (u.email || '').toLowerCase() === coachEmail)
        if (match) coachUserId = match.id
        if (data.users.length < 200) break
        page += 1
      }
    }
    if (!coachUserId) return json({ error: 'Código de convite não reconhecido.' }, 400)
    const { data: coachProfile, error: coachProfileErr } = await admin
      .from('bt_perfis').select('user_id').eq('user_id', coachUserId).eq('papel', 'treinador').maybeSingle()
    if (coachProfileErr) return json({ error: 'Falha ao validar o código de convite.' }, 500)
    if (!coachProfile) return json({ error: 'Código de convite não reconhecido.' }, 400)

    // 2) slug já em uso?
    const { data: existingAtleta } = await admin.from('bt_atletas').select('atleta_id').eq('atleta_id', atletaSlug).maybeSingle()
    if (existingAtleta) return json({ error: `O identificador "${atletaSlug}" já está em uso — escolha outro.` }, 409)

    // 3) cria o usuário já confirmado (evita o problema de confirmação de
    // e-mail que trava o fluxo manual por script).
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password: senha, email_confirm: true, user_metadata: { nome },
    })
    if (createErr || !created?.user) return json({ error: `Falha ao criar usuário: ${createErr?.message || 'erro desconhecido'}` }, 500)
    const newUserId = created.user.id

    // 4) perfil + ficha, com rollback do usuário se qualquer um falhar —
    // evita a conta órfã (usuário sem perfil/ficha) que o fluxo manual gerou.
    const { error: perfilErr } = await admin.from('bt_perfis').insert([
      { user_id: newUserId, papel: 'atleta', nome, atleta_id: atletaSlug },
    ])
    if (perfilErr) {
      await admin.auth.admin.deleteUser(newUserId)
      return json({ error: `Falha ao criar perfil: ${perfilErr.message}` }, 500)
    }
    const { error: atletaErr } = await admin.from('bt_atletas').insert([{
      atleta_id: atletaSlug, treinador_id: coachUserId, nome, status: 'ativo',
      consentimento_aceito_em: new Date().toISOString(), consentimento_versao: CONSENT_VERSION,
    }])
    if (atletaErr) {
      await admin.auth.admin.deleteUser(newUserId)
      return json({ error: `Falha ao criar ficha do atleta: ${atletaErr.message}` }, 500)
    }

    return json({ ok: true })
  } catch (error) {
    console.error('signup-atleta', error)
    return json({ error: 'Falha interna no cadastro' }, 500)
  }
})
