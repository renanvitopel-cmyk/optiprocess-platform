import rateLimit from "express-rate-limit";

/** Login: poucas tentativas por IP para dificultar forca bruta. */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas de login. Tente novamente em alguns minutos." },
});

/** Formularios publicos (orcamento, contato, validacao de certificado). */
export const publicFormRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas solicitacoes. Tente novamente em alguns minutos." },
});
