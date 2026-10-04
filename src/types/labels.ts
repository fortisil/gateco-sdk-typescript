/**
 * Label vocabularies (1.13.0; cold-run findings #10, #12, #13).
 *
 * The server accepts exactly these values for `classification` and `sensitivity`
 * and answers 422 to anything else. Until 1.13.0 the SDK typed both as `string`,
 * so the vocabulary was discoverable only in the web docs. These unions are
 * compile-time only: a non-vocabulary string was already refused by the server.
 *
 * Policy conditions compare them with `lte` / `gte` in the order listed here
 * (`public < internal < confidential < restricted`, `low < medium < high < critical`).
 */

export const CLASSIFICATIONS = ["public", "internal", "confidential", "restricted"] as const;
export const SENSITIVITIES = ["low", "medium", "high", "critical"] as const;

/** Who may see a resource, least to most restricted. */
export type Classification = (typeof CLASSIFICATIONS)[number];
/** Harm if the resource leaks, least to most severe. */
export type Sensitivity = (typeof SENSITIVITIES)[number];
