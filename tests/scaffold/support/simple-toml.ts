export type SimpleTomlValue =
  string | number | boolean | SimpleTomlValue[] | Record<string, unknown>;
export type SimpleTomlSection = ReadonlyMap<string, SimpleTomlValue>;
export type SimpleTomlDocument = ReadonlyMap<string, SimpleTomlSection>;

type QuoteCharacter = '"' | "'";

function isQuoteCharacter(character: string): character is QuoteCharacter {
  return character === '"' || character === "'";
}

function stripComment(line: string): string {
  let quote: QuoteCharacter | null = null;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index] ?? '';

    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote === '"' && character === '\\') {
      escaped = true;
      continue;
    }
    if (isQuoteCharacter(character) && (quote === null || quote === character)) {
      quote = quote === null ? character : null;
      continue;
    }
    if (quote === null && character === '#') {
      return line.slice(0, index);
    }
  }

  if (quote !== null) {
    throw new Error('TOML contains an unterminated string.');
  }

  return line;
}

function arrayBalance(value: string): number {
  let balance = 0;
  let quote: QuoteCharacter | null = null;
  let escaped = false;

  for (const character of value) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote === '"' && character === '\\') {
      escaped = true;
      continue;
    }
    if (isQuoteCharacter(character) && (quote === null || quote === character)) {
      quote = quote === null ? character : null;
      continue;
    }
    if (quote !== null) {
      continue;
    }
    if (character === '[') {
      balance += 1;
    } else if (character === ']') {
      balance -= 1;
    }
  }

  return balance;
}

function splitCollectionEntries(value: string): readonly string[] {
  const entries: string[] = [];
  let current = '';
  let arrayBalance = 0;
  let tableBalance = 0;
  let quote: QuoteCharacter | null = null;
  let escaped = false;

  for (const character of value) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (quote === '"' && character === '\\') {
      current += character;
      escaped = true;
      continue;
    }
    if (isQuoteCharacter(character) && (quote === null || quote === character)) {
      current += character;
      quote = quote === null ? character : null;
      continue;
    }
    if (quote === null && character === '[') {
      arrayBalance += 1;
    } else if (quote === null && character === ']') {
      arrayBalance -= 1;
    } else if (quote === null && character === '{') {
      tableBalance += 1;
    } else if (quote === null && character === '}') {
      tableBalance -= 1;
    }
    if (quote === null && arrayBalance === 0 && tableBalance === 0 && character === ',') {
      if (current.trim()) {
        entries.push(current.trim());
      }
      current = '';
      continue;
    }

    current += character;
  }

  if (quote !== null || arrayBalance !== 0 || tableBalance !== 0) {
    throw new Error('TOML contains an unbalanced collection.');
  }
  if (current.trim()) {
    entries.push(current.trim());
  }

  return entries;
}

function parseInlineTable(value: string): Record<string, unknown> {
  const inner = value.slice(1, -1).trim();
  if (!inner) {
    return {};
  }

  const entries: [string, SimpleTomlValue][] = [];
  const keys = new Set<string>();
  for (const entry of splitCollectionEntries(inner)) {
    const assignmentMatch = /^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/.exec(entry);
    const key = assignmentMatch?.[1];
    const rawValue = assignmentMatch?.[2];
    if (key === undefined || rawValue === undefined) {
      throw new Error('TOML contains an invalid inline table entry.');
    }
    if (keys.has(key)) {
      throw new Error('TOML contains a duplicate inline table key.');
    }
    keys.add(key);
    entries.push([key, parseValue(rawValue)]);
  }

  return Object.fromEntries(entries);
}

function parseValue(value: string): SimpleTomlValue {
  const trimmed = value.trim();

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      throw new Error('TOML contains an invalid quoted string.');
    }
    if (typeof parsed !== 'string') {
      throw new Error('TOML contains an invalid quoted string.');
    }
    return parsed;
  }
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }
  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      throw new Error('TOML contains a non-finite decimal value.');
    }
    return parsed;
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    return inner ? splitCollectionEntries(inner).map((entry) => parseValue(entry)) : [];
  }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return parseInlineTable(trimmed);
  }

  throw new Error('TOML contains a value outside the scaffold parser subset.');
}

export function parseSimpleToml(source: string): SimpleTomlDocument {
  const sections = new Map<string, Map<string, SimpleTomlValue>>();
  let currentSection = '';
  sections.set(currentSection, new Map());
  let pending = '';

  for (const physicalLine of source.replaceAll('\r\n', '\n').split('\n')) {
    const line = stripComment(physicalLine).trim();

    if (!line) {
      continue;
    }

    pending = pending ? `${pending} ${line}` : line;
    if (arrayBalance(pending) > 0) {
      continue;
    }
    if (arrayBalance(pending) < 0) {
      throw new Error('TOML contains an unmatched array terminator.');
    }

    const sectionMatch = /^\[([A-Za-z0-9_.-]+)]$/.exec(pending);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      if (sectionName === undefined) {
        throw new Error('TOML contains an invalid section.');
      }
      if (sections.has(sectionName)) {
        throw new Error('TOML contains a duplicate section.');
      }
      currentSection = sectionName;
      sections.set(currentSection, new Map());
      pending = '';
      continue;
    }

    const assignmentMatch = /^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/.exec(pending);
    if (!assignmentMatch) {
      throw new Error('TOML contains an unsupported statement.');
    }
    const key = assignmentMatch[1];
    const rawValue = assignmentMatch[2];
    const section = sections.get(currentSection);
    if (key === undefined || rawValue === undefined || section === undefined) {
      throw new Error('TOML contains an invalid assignment.');
    }
    if (section.has(key)) {
      throw new Error('TOML contains a duplicate key.');
    }
    section.set(key, parseValue(rawValue));
    pending = '';
  }

  if (pending) {
    throw new Error('TOML contains an incomplete statement.');
  }

  return sections;
}

export function requireTomlSection(
  document: SimpleTomlDocument,
  sectionName: string,
  label: string,
): SimpleTomlSection {
  const section = document.get(sectionName);

  if (section === undefined) {
    throw new Error(`${label} is missing the ${sectionName} section.`);
  }

  return section;
}

export function tomlSectionObject(section: SimpleTomlSection): Record<string, SimpleTomlValue> {
  return Object.fromEntries(section);
}
