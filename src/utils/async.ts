/** Evita awaits colgados en red/Supabase. */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "La operación tardó demasiado"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}
