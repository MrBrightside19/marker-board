export function getAuthErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";

  if (/no api key found/i.test(raw)) {
    return (
      "Falta la clave de API de Supabase en la petición. " +
      "Revisa VITE_SUPABASE_ANON_KEY en .env (clave anon o publishable del panel) y reinicia yarn dev."
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "No se pudo completar la operación.";
}
