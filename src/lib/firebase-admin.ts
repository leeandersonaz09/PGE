import * as admin from 'firebase-admin';

// Função auxiliar para limpar e formatar a chave no Windows
const formatKey = (key: string | undefined) => {
  if (!key) return undefined;
  // Remove aspas que podem ter vindo do .env e trata os escapes de nova linha
  return key.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
};

if (!admin.apps.length) {
  try {
    const privateKey = formatKey(process.env.FIREBASE_PRIVATE_KEY);
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("✅ Firebase Admin conectado com sucesso!");
  } catch (error: any) {
    console.error("❌ Erro na inicialização do Admin:", error.message);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : (null as any);