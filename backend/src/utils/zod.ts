import { z } from "zod";

/**
 * Data opcional que aceita campo vazio.
 *
 * Um <input type="date"> em branco manda "" - e z.coerce.date() transforma isso num
 * "Invalid date" que o formulario devolve como erro de validacao no meio do salvamento,
 * sem dizer a quem preencheu que o problema e' um campo que ele deliberadamente deixou em
 * branco. Aqui "" e' o que sempre foi: nenhuma data.
 */
export const dataOpcional = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.date().nullable(),
);
