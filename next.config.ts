import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  reactStrictMode: true,

  images: {
    unoptimized: true, // importante na Netlify
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.cspba.com.br" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Corrige problema de OAuth popup Google
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },

          // Evita cache agressivo que quebra sessão
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
