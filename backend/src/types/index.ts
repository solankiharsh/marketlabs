export interface JwtPayload {
  sub: string;
  privyId: string;
  wallet?: string;
  type?: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

