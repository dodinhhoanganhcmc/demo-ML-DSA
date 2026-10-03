const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type ParamSet = "ML-DSA-44" | "ML-DSA-65" | "ML-DSA-87";
export type Encoding = "utf8" | "base64";

export interface ParamInfo {
  name: ParamSet;
  security_category: number;
  standard_reference: {
    public_key_bytes: number;
    secret_key_bytes: number;
    signature_bytes: number;
    source: string;
  };
}

export interface ParamsResponse {
  param_sets: ParamInfo[];
  classical: { name: string; source: string }[];
  max_message_bytes: number;
}

export interface KeygenResponse {
  param_set: ParamSet;
  public_key: string;
  secret_key: string;
  measured: { public_key_bytes: number; secret_key_bytes: number };
  keygen_ms: number;
}

export interface SignResponse {
  param_set: ParamSet;
  signature: string;
  measured: { signature_bytes: number };
  message_bytes: number;
  sign_ms: number;
}

export interface VerifyResponse {
  param_set: ParamSet;
  valid: boolean;
  verify_ms: number;
  note: string;
}

export interface BenchmarkRow {
  algorithm: string;
  kind: "post-quantum" | "classical";
  security_category: number | null;
  public_key_bytes: number;
  secret_key_bytes: number;
  signature_bytes: number;
  standard_reference: {
    public_key_bytes: number;
    secret_key_bytes: number;
    signature_bytes: number;
  };
  keygen_ms: number;
  sign_ms_avg: number;
  verify_ms_avg: number;
  roundtrip_ok: boolean;
}

export interface BenchmarkResponse {
  message_bytes: number;
  iterations: number;
  results: BenchmarkRow[];
  measured_at: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    // RFC 7807 problem+json from the backend, or a plain message.
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.title ?? detail;
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),
  params: () => request<ParamsResponse>("/api/params"),
  keygen: (param_set: ParamSet) =>
    request<KeygenResponse>("/api/keys", {
      method: "POST",
      body: JSON.stringify({ param_set }),
    }),
  sign: (param_set: ParamSet, secret_key: string, message: string, message_encoding: Encoding = "utf8") =>
    request<SignResponse>("/api/signatures", {
      method: "POST",
      body: JSON.stringify({ param_set, secret_key, message, message_encoding }),
    }),
  verify: (
    param_set: ParamSet,
    public_key: string,
    message: string,
    signature: string,
    message_encoding: Encoding = "utf8",
  ) =>
    request<VerifyResponse>("/api/verifications", {
      method: "POST",
      body: JSON.stringify({ param_set, public_key, message, signature, message_encoding }),
    }),
  benchmark: (message: string, iterations: number) =>
    request<BenchmarkResponse>("/api/benchmarks", {
      method: "POST",
      body: JSON.stringify({ message, iterations }),
    }),
};
