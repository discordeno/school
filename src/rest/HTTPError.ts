class HTTPError extends Error {
  code: number;
  method: string;
  name: string;
  path: string;

  constructor(message: string, name: string, code: number, method: string, path: string) {
    super(message);

    this.name = name;
    this.code = code || 500;
    this.method = method;
    this.path = path;
  }
}

export default HTTPError;
