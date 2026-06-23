import type { HelmetOptions } from "helmet";

// Tạo cấu hình Helmet dùng chung cho Catalog Service.
export function buildHelmetOptions(isDev: boolean): HelmetOptions {
  return {
    hidePoweredBy: true,
    noSniff: true,
    frameguard: { action: "deny" },
    xssFilter: true,
    hsts: isDev
      ? false
      : {
          maxAge: 31_536_000,
          includeSubDomains: true,
          preload: true,
        },
    contentSecurityPolicy: isDev
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
    referrerPolicy: { policy: "no-referrer" },
    dnsPrefetchControl: { allow: false },
  };
}

