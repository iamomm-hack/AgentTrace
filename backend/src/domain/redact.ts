import type { JsonObject, JsonValue } from "./models.js";
import { validation } from "./errors.js";

const REDACTED = "[REDACTED]";
const sensitiveKey = /(?:^|[_-])(api[_-]?key|access[_-]?token|refresh[_-]?token|auth(?:orization)?|password|passwd|secret|private[_-]?key|cookie|session)(?:$|[_-])/i;
const bearer = /^(?:bearer|basic)\s+[a-z0-9._~+\/-]+=*$/i;
const privateKey = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;

export interface RedactionResult<T extends JsonValue> {
  value: T;
  paths: string[];
}

export function redactJson<T extends JsonValue>(input: T): RedactionResult<T> {
  const paths: string[] = [];
  const visit = (value: JsonValue, path: string, key?: string, depth = 0): JsonValue => {
    if (depth > 64) throw validation("JSON nesting cannot exceed 64 levels", { path: path || "/" });
    if (key && sensitiveKey.test(key)) { paths.push(path); return REDACTED; }
    if (typeof value === "string" && (bearer.test(value) || privateKey.test(value))) { paths.push(path); return REDACTED; }
    if (Array.isArray(value)) return value.map((item, index) => visit(item, `${path}/${index}`, undefined, depth + 1));
    if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, visit(child, `${path}/${escapePointer(childKey)}`, childKey, depth + 1)]));
    return value;
  };
  return { value: visit(input, "") as T, paths };
}

function escapePointer(value: string): string { return value.replaceAll("~", "~0").replaceAll("/", "~1"); }

export function redactObject(input: JsonObject): RedactionResult<JsonObject> { return redactJson(input); }
