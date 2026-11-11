import { compareStrings } from './artifacts';

export type JsonRecord = Record<string, unknown>;

export function requireJsonRecord(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value as JsonRecord;
}

export function requireJsonArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  return value;
}

export function requireOwnValue(record: JsonRecord, key: string, label: string): unknown {
  if (!Object.hasOwn(record, key)) {
    throw new Error(`${label} must define ${key}.`);
  }

  return record[key];
}

export function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string.`);
  }

  return value;
}

export function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean.`);
  }

  return value;
}

export function requireNullableString(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }

  return requireString(value, label);
}

export function requireStringArray(value: unknown, label: string): readonly string[] {
  const values = requireJsonArray(value, label);

  return values.map((entry, index) => requireString(entry, `${label}[${String(index)}]`));
}

export function assertExactKeys(
  record: JsonRecord,
  expectedKeys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(record).sort(compareStrings);
  const expected = [...expectedKeys].sort(compareStrings);

  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} has an unexpected key set.`);
  }
}

export function assertExactJsonValue(actual: unknown, expected: unknown, label: string): void {
  if (Array.isArray(expected)) {
    const actualArray = requireJsonArray(actual, label);

    if (actualArray.length !== expected.length) {
      throw new Error(`${label} has an unexpected array length.`);
    }

    expected.forEach((expectedEntry, index) => {
      assertExactJsonValue(actualArray[index], expectedEntry, `${label}[${String(index)}]`);
    });
    return;
  }

  if (expected !== null && typeof expected === 'object') {
    const actualRecord = requireJsonRecord(actual, label);
    const expectedRecord = expected as JsonRecord;
    assertExactKeys(actualRecord, Object.keys(expectedRecord), label);

    for (const [key, expectedValue] of Object.entries(expectedRecord)) {
      assertExactJsonValue(actualRecord[key], expectedValue, `${label}.${key}`);
    }
    return;
  }

  if (!Object.is(actual, expected)) {
    throw new Error(`${label} has an unexpected value.`);
  }
}
