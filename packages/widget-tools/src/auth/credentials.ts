/**
 * Stored login sessions, one per Teacharium server (API URL).
 *
 * Saved to `$XDG_CONFIG_HOME/teacharium/credentials.json` (or the platform
 * equivalent) with owner-only permissions.
 */
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface StoredSession {
  apiUrl: string;
  clientId: string;
  tokenEndpoint: string;
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt?: number;
  email?: string;
}

type CredentialsFile = Record<string, StoredSession>;

export function configDir(): string {
  if (process.env.TEACHARIUM_CONFIG_DIR) return process.env.TEACHARIUM_CONFIG_DIR;
  if (process.platform === "win32" && process.env.APPDATA) {
    return join(process.env.APPDATA, "teacharium");
  }
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "teacharium");
}

const credentialsPath = () => join(configDir(), "credentials.json");

export function normalizeApiUrl(apiUrl: string): string {
  return apiUrl.replace(/\/+$/, "");
}

function readAll(): CredentialsFile {
  const path = credentialsPath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CredentialsFile;
  } catch {
    return {};
  }
}

function writeAll(data: CredentialsFile) {
  const path = credentialsPath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

export function getSession(apiUrl: string): StoredSession | undefined {
  return readAll()[normalizeApiUrl(apiUrl)];
}

export function saveSession(session: StoredSession) {
  const data = readAll();
  data[normalizeApiUrl(session.apiUrl)] = {
    ...session,
    apiUrl: normalizeApiUrl(session.apiUrl),
  };
  writeAll(data);
}

export function deleteSession(apiUrl: string): boolean {
  const data = readAll();
  const key = normalizeApiUrl(apiUrl);
  if (!data[key]) return false;
  delete data[key];
  writeAll(data);
  return true;
}
