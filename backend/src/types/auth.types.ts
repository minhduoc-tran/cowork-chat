export interface AccessTokenPayload {
  sub: string;
  email: string;
  type: "access";
  iat: number;
  exp: number;
  jti: string;
}

export interface OAuthStatePayload {
  nonce: string;
  provider: "google";
  iat: number;
  exp: number;
}

export interface RequestUser {
  id: number;
  email: string;
}

export interface SafeUser {
  id: number;
  email: string;
  displayName: string;
  avatar: string | null;
}

export interface AuthSessionResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}
