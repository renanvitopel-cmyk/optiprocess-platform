/**
 * Dados institucionais usados nos documentos gerados pela plataforma
 * (certificados de calibracao, laudos). Podem ser sobrescritos por variaveis
 * de ambiente sem mexer no codigo.
 */
export const COMPANY_INFO = {
  name: process.env.COMPANY_NAME ?? "OptiProcess",
  fullName:
    process.env.COMPANY_FULL_NAME ??
    "OptiProcess - Instalacao, Manutencao Eletrica, Eletronica e Instrumentacao",
  address: process.env.COMPANY_ADDRESS ?? "Rua Cuba, 212 - Vila Barcelona - Sorocaba/SP - CEP 18025-540",
  phone: process.env.COMPANY_PHONE ?? "(15) 99784-7299",
  email: process.env.COMPANY_EMAIL ?? "contatooptprocess@gmail.com",
};
