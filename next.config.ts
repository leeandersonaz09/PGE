import type { NextConfig } from "next";

const nextConfig = {
  output: 'standalone',
  // Se estiver usando imagens externas do Supabase/Firebase
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.cspba.com.br' },
    ],
  },
};

export default nextConfig;
