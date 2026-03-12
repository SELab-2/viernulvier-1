export function hasOwn<T extends object, K extends PropertyKey>(obj: T, key: K): key is Extract<K, keyof T> {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function getFieldValue<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
  // eslint-disable-next-line security/detect-object-injection
  return obj[key];
}

export function getNullableFieldValue<T extends object, K extends keyof T>(obj: T, key: K) {
  return getFieldValue(obj, key) ?? null;
}

