"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isJsonValue = isJsonValue;
exports.normalizeJson = normalizeJson;
exports.stableStringify = stableStringify;
function isJsonValue(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean")
        return true;
    if (typeof value === "number")
        return Number.isFinite(value);
    if (Array.isArray(value))
        return value.every(isJsonValue);
    if (typeof value === "object") {
        return Object.values(value).every(isJsonValue);
    }
    return false;
}
function normalizeJson(value) {
    if (Array.isArray(value))
        return value.map(normalizeJson);
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalizeJson(value[key])]));
    }
    return value;
}
function stableStringify(value) {
    return JSON.stringify(value === undefined ? null : normalizeJson(value));
}
//# sourceMappingURL=contracts.js.map