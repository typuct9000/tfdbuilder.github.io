// Typed Object.keys
export const keysOf = Object.keys as <T extends object>(obj: T) => Array<keyof T>;