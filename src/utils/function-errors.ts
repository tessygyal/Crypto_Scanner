/** A failed Edge Function call, reduced to what we need to pick a message. */
export type FunctionFailure =
  | { kind: 'http'; status: number; code?: string }
  | { kind: 'network' }
  | { kind: 'not_configured_app' }
  | { kind: 'other' };
