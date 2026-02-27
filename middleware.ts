import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// URL das chaves públicas do Google para validar tokens do Firebase
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('__session')?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      // 1. Cria um "verificador" que busca e faz cache das chaves do Google automaticamente
      const JWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

      // 2. VALIDAÇÃO TOTAL: Verifica assinatura, expiração e emissor (Firebase)
      const { payload } = await jose.jwtVerify(session, JWKS, {
        issuer: 'https://securetoken.google.com/pge-new', // Substitua pelo seu Project ID do Firebase
        audience: 'pge-new',
      });

      // 3. Verificação de Domínio (O que você pediu para o Workspace)
      const email = payload.email as string;
      const dominiosAutorizados = ["cspba.com.br", "anchietaba.com.br"];
      const dominioEmail = email?.split("@")[1];

      if (!dominiosAutorizados.includes(dominioEmail)) {
        return NextResponse.redirect(new URL('/', request.url));
      }

    } catch (error) {
      // Se a assinatura for falsa ou o token expirou, o jose lança um erro aqui
      console.error("Token inválido ou assinatura corrompida:", error);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};