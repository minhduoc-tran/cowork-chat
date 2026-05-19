export function getCookieValue(
  cookieString: string,
  cookieName: string
): string | null {
  const match = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!match) return null;

  return decodeURIComponent(match.slice(cookieName.length + 1));
}

function isMutatingMethod(method?: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(
    (method ?? "").toUpperCase()
  );
}

export function getCsrfHeaderValue(
  method: string | undefined,
  cookieString: string,
  cookieName: string
): string | null {
  if (!isMutatingMethod(method)) return null;
  return getCookieValue(cookieString, cookieName);
}
