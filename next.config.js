/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // Ocultar "X-Powered-By: Next.js"

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Previene clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Evita MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Fuerza HTTPS por 1 año
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          // Controla información del referrer
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Deshabilita features innecesarias del browser
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval necesario para Next.js dev
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Limitar tamaño de uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

module.exports = nextConfig;
