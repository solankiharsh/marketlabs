'use strict';

import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// In browser use same-origin so Next.js rewrites proxy /api/* to backend (avoids CORS and wrong-host 404s)
const BASE_URL =
  typeof window !== 'undefined' ? '' : API_URL;

/** Zing API response shape: { code: 1 = success, msg, data } */
export interface ZingResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

export function unwrap<T>(response: AxiosResponse<ZingResponse<T>>): T {
  const { data } = response;
  if (data.code !== 1 && data.code !== 200) {
    const msg = data.msg || 'Request failed';
    const err = new Error(msg) as Error & { response?: AxiosResponse };
    err.response = response;
    throw err;
  }
  return data.data as T;
}

export class TokenManager {
  private token: string | null = null;
  private readonly STORAGE_KEY = 'zing_jwt';

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(this.STORAGE_KEY);
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
}

export const tokenManager = new TokenManager();

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = tokenManager.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      tokenManager.clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
