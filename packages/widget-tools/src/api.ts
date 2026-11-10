/**
 * Client for the Teacharium CLI widget API (`/api/widgets/cli/*`).
 */
import { readFileSync, existsSync } from "node:fs";

import { forceRefresh, getAccessToken } from "./auth/oauth.js";

export interface ApiOrganization {
  id: string;
  name: string;
  role: string | null;
  isDefault: boolean;
}

export interface ApiWidget {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  source: string;
  isPublic: boolean;
  updatedAt: string | null;
}

export interface WhoAmI {
  kind: "user" | "org-token";
  user: { id: string; email?: string } | null;
  token: { name: string } | null;
  organizations: ApiOrganization[];
  environment: string;
}

export interface PublishResponse {
  widget: ApiWidget;
  environment: string;
  publishedAt: string | null;
  components: string[];
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class TeachariumApi {
  constructor(public readonly apiUrl: string) {}

  private async request<T>(
    path: string,
    init: RequestInit = {},
    retried = false,
  ): Promise<T> {
    const token = await getAccessToken(this.apiUrl);
    let response: Response;
    try {
      response = await fetch(`${this.apiUrl}${path}`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      throw new Error(
        `Could not reach ${this.apiUrl} (${error instanceof Error ? error.message : error}).`,
      );
    }

    if (response.status === 401 && !retried) {
      const refreshed = await forceRefresh(this.apiUrl).catch(() => null);
      if (refreshed) return this.request<T>(path, init, true);
    }

    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new ApiError(
        response.status,
        "BAD_RESPONSE",
        `Unexpected response from ${this.apiUrl}${path} (${response.status}). Is --api-url a Teacharium server?`,
      );
    }
    if (!response.ok) {
      const error = (body as { error?: { code?: string; message?: string; details?: unknown } })
        .error;
      throw new ApiError(
        response.status,
        error?.code ?? "HTTP_ERROR",
        error?.message ?? `Request failed (${response.status})`,
        error?.details,
      );
    }
    return body as T;
  }

  whoami() {
    return this.request<WhoAmI>("/api/widgets/cli/whoami");
  }

  async listWidgets() {
    return (await this.request<{ widgets: ApiWidget[] }>("/api/widgets/cli"))
      .widgets;
  }

  async createWidget(input: {
    name: string;
    description?: string;
    organizationId?: string;
  }) {
    return (
      await this.request<{ widget: ApiWidget }>("/api/widgets/cli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    ).widget;
  }

  publish(
    widgetId: string,
    files: { js: string; css: string; manifest: string },
  ) {
    const form = new FormData();
    form.append(
      "js",
      new Blob([readFileSync(files.js)], { type: "application/javascript" }),
      "widget.js",
    );
    if (existsSync(files.css)) {
      form.append(
        "css",
        new Blob([readFileSync(files.css)], { type: "text/css" }),
        "widget.css",
      );
    }
    form.append(
      "manifest",
      new Blob([readFileSync(files.manifest)], { type: "application/json" }),
      "manifest.json",
    );
    return this.request<PublishResponse>(
      `/api/widgets/cli/${encodeURIComponent(widgetId)}/publish`,
      { method: "POST", body: form },
    );
  }
}
