'use strict';

import { api, unwrap, tokenManager } from './client';
import type { ZingResponse } from './client';

export interface SecurityConfig {
  turnstile_enabled?: boolean;
  turnstile_site_key?: string;
  registration_enabled?: boolean;
  oauth_google_enabled?: boolean;
  oauth_github_enabled?: boolean;
}

export interface UserInfo {
  id: number;
  username: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface LoginResult {
  token: string;
  userinfo: UserInfo;
}

export async function getSecurityConfig(): Promise<SecurityConfig> {
  const response = await api.get<ZingResponse<SecurityConfig>>('/api/auth/security-config');
  return unwrap(response);
}

export async function login(username: string, password: string, turnstileToken?: string): Promise<LoginResult> {
  const response = await api.post<ZingResponse<LoginResult>>('/api/auth/login', {
    username,
    password,
    turnstile_token: turnstileToken,
  });
  const result = unwrap(response);
  if (result.token) {
    tokenManager.setToken(result.token);
  }
  return result;
}

export async function register(
  email: string,
  code: string,
  username: string,
  password: string
): Promise<LoginResult> {
  const response = await api.post<ZingResponse<LoginResult>>('/api/auth/register', {
    email,
    code,
    username,
    password,
  });
  const result = unwrap(response);
  if (result.token) {
    tokenManager.setToken(result.token);
  }
  return result;
}

export async function sendCode(
  email: string,
  type: 'register' | 'reset_password' | 'change_password' | 'change_email'
): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/auth/send-code', { email, type });
  unwrap(response);
}

export async function getUserInfo(): Promise<UserInfo> {
  const response = await api.get<ZingResponse<UserInfo>>('/api/auth/info');
  return unwrap(response);
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout');
  } finally {
    tokenManager.clearToken();
  }
}
