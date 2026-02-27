import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    // 1. EXTRAIR O TOKEN DE AUTENTICAÇÃO
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Acesso negado: Token não fornecido' }, { status: 401 });
    }

    // 2. VALIDAR O TOKEN COM O FIREBASE ADMIN
    // Isso garante que só quem está logado no seu Firebase entra aqui
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Acesso negado: Usuário inválido' }, { status: 403 });
    }

    // 3. CONECTAR AO SUPABASE COM A CHAVE MESTRA (SERVICE ROLE)
    // Usamos as variáveis que você configurou no .env.local
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    );

    // 4. BUSCAR OS DADOS (Agora com permissão total do servidor)
    const { data, error } = await supabaseAdmin
      .from('alunos')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. RETORNAR OS DADOS PARA O FRONTEND
    return NextResponse.json(data);

  } catch (err: any) {
    console.error('Erro na API de Alunos:', err);
    return NextResponse.json({ error: 'Erro interno de segurança' }, { status: 500 });
  }
}