import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import env from "../configs/env";
import { db } from "../drizzle";
import { usersTable } from "../drizzle/schemas/user.schema";
import { signOAuthState, verifyOAuthState } from "../utils/jwt.util";
import { authService } from "./auth.service";

const client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

async function generateAuthUrl(): Promise<{ url: string; state: string }> {
  const state = signOAuthState({
    nonce: randomUUID(),
    provider: "google"
  });

  const url = client.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state
  });

  return { url, state };
}

async function exchangeCodeForTokens(code: string) {
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  return tokens;
}

async function getGoogleProfile(tokens: {
  id_token?: string | null;
}): Promise<GoogleUserInfo | null> {
  if (!tokens.id_token) {
    return null;
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();
  if (!payload) {
    return null;
  }

  return {
    id: payload.sub,
    email: payload.email!,
    verified_email: payload.email_verified ?? false,
    name: payload.name ?? "",
    given_name: payload.given_name ?? "",
    family_name: payload.family_name ?? "",
    picture: payload.picture ?? "",
    locale: payload.locale ?? ""
  };
}

async function upsertGoogleUser(googleUser: GoogleUserInfo) {
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, googleUser.email)
  });

  if (existing) {
    if (!existing.googleId) {
      await db
        .update(usersTable)
        .set({
          googleId: googleUser.id,
          avatar: googleUser.picture
        })
        .where(eq(usersTable.id, existing.id));
    } else if (existing.googleId !== googleUser.id) {
      throw new Error("Email already linked to a different Google account");
    }
    return existing;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      email: googleUser.email,
      googleId: googleUser.id,
      displayName: googleUser.name || googleUser.email.split("@")[0],
      avatar: googleUser.picture,
      passwordHash: null
    })
    .returning();

  return user;
}

async function handleCallback(code: string, state: string) {
  verifyOAuthState(state);

  const tokens = await exchangeCodeForTokens(code);
  const profile = await getGoogleProfile(tokens);

  if (!profile || !profile.verified_email) {
    throw new Error("Google account email not verified");
  }

  const user = await upsertGoogleUser(profile);
  return authService.generateAuthSession(user);
}

export const googleOAuthService = {
  generateAuthUrl,
  exchangeCodeForTokens,
  getGoogleProfile,
  upsertGoogleUser,
  handleCallback
};
