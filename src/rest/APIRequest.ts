import { browser, UserAgent } from "../util/Constants.ts";
import RESTManager from "./RESTManager.ts";
import Client from "../client/Client.ts";

interface APIRequestOptions {
  route?: string;
  query?: Record<string, unknown>;
  versioned?: boolean;
  auth?: boolean;
  reason?: string;
  headers?: Record<string, unknown>;
  data?: Record<string, unknown>;
  files: { name: string; file: string | Blob }[];
}

class APIRequest {
  rest: RESTManager;
  client: Client;
  method: string;
  retries: number;
  route?: string;
  options: APIRequestOptions;
  path: string;

  constructor(rest: RESTManager, method: string, path: string, options: APIRequestOptions) {
    this.rest = rest;
    this.client = rest.client;
    this.method = method;
    this.route = options.route;
    this.options = options;
    this.retries = 0;

    let queryString = "";
    if (options.query) {
      const query = Object.entries(options.query)
        .filter(([, value]) => ![null, "null", "undefined"].includes(value as string) && typeof value !== "undefined")
        .flatMap(([key, value]) => (Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]]));
      queryString = new URLSearchParams(query).toString();
    }
    this.path = `${path}${queryString && `?${queryString}`}`;
  }

  make() {
    const API =
      this.options.versioned === false
        ? this.client.options.http.api
        : `${this.client.options.http.api}/v${this.client.options.http.version}`;
    const url = API + this.path;
    let headers: HeadersInit = {};

    if (this.options.auth !== false) headers.Authorization = this.rest.getAuth();
    if (this.options.reason) headers["X-Audit-Log-Reason"] = encodeURIComponent(this.options.reason);
    if (!browser && UserAgent) headers["User-Agent"] = UserAgent;
    if (this.options.headers) headers = Object.assign(headers, this.options.headers);

    let body;
    if (this.options.files && this.options.files.length) {
      body = new FormData();
      for (const file of this.options.files) if (file && file.file) body.append(file.name, file.file, file.name);
      if (typeof this.options.data !== "undefined") body.append("payload_json", JSON.stringify(this.options.data));
      // if (!browser) headers = Object.assign(headers, body.getHeaders());
    } else if (this.options.data != null) {
      body = JSON.stringify(this.options.data);
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = this.client.setTimeout(() => controller.abort(), this.client.options.restRequestTimeout);
    return fetch(url, {
      method: this.method,
      headers,
      keepalive: true,
      body,
      signal: controller.signal,
    }).finally(() => this.client.clearTimeout(timeout));
  }
}

export default APIRequest;
