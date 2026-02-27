import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// URL das chaves públicas do Google para validar tokens do Firebase
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export async function middleware(request: NextRequest) {
  // Tentamos ler o cookie de sessão. 
  // Nota: Para este middleware funcionar, o seu Login deve salvar o Token no cookie '__session'.
  const session = request.cookies.get('__session')?.value;
  const { pathname } = request.nextUrl;

  // Proteção das rotas do Dashboard
  if (pathname.startsWith('/dashboard')) {
    
    // Se não houver cookie, redireciona para a Home (Login)
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      // 1. Cria um "verificador" que busca e faz cache das chaves do Google automaticamente
      const JWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

      // 2. VALIDAÇÃO TOTAL: Verifica assinatura, expiração e emissor (Firebase)
      const { payload } = await jose.jwtVerify(session, JWKS, {
        issuer: 'https://securetoken.google.com/pge-new',
        audience: 'pge-new',
      });

      // 3. Verificação de Domínio (Bloqueio para e-mails pessoais @gmail.com)
      const email = payload.email as string;
      const dominiosAutorizados = ["cspba.com.br", "anchietaba.com.br"];
      const dominioEmail = email?.split("@")[1];

      if (!dominioEmail || !dominiosAutorizados.includes(dominioEmail)) {
        console.error("Acesso negado: Domínio não autorizado.");
        return NextResponse.redirect(new URL('/', request.url));
      }

      // Se passou em tudo, permite o acesso
      return NextResponse.next();

    } catch (error) {
      // Se o token expirou ou é inválido, limpa e redireciona
      console.error("Token inválido ou assinatura corrompida:", error);
      const response = NextResponse.redirect(new URL('/', request.url));
      // Remove o cookie inválido para evitar loops
      response.cookies.delete('__session');
      return response;
    }
  }

  return NextResponse.next();
}

// O Matcher garante que o middleware só rode nas páginas do dashboard
export const config = {
  matcher: ['/dashboard/:path*'],
};