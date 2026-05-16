import { signAccessToken } from "../../src/utils/jwt.util";

export function createBearerToken(userId: number, email: string) {
  const accessToken = signAccessToken({
    id: userId,
    email
  });

  return `Bearer ${accessToken}`;
}