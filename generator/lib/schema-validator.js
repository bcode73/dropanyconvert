/**
 * Focused JSON Schema draft-07 validator.
 * Handles the subset of features actually used in tool.schema.json:
 *   type, required, properties, additionalProperties, items, enum,
 *   pattern, minItems, minimum, $ref (not supported — schema is self-contained).
 *
 * Returns { valid: boolean, errors: string[] }
 */

export function validate(schema, data, path = '') {
  const errors = [];

  function fail(msg) {
    errors.push(path ? `${path}: ${msg}` : msg);
  }

  // type
  if (schema.type) {
    const jsType = Array.isArray(data) ? 'array' : typeof data;
    const expected = schema.type;
    // JSON Schema "integer" maps to JS numbers that have no fractional part
    const actual = (jsType === 'number' && expected === 'integer' && Number.isInteger(data))
      ? 'integer'
      : jsType;
    if (actual !== expected) {
      fail(`expected type "${expected}", got "${jsType}"`);
      return errors; // type mismatch — further checks are meaningless
    }
  }

  // enum
  if (schema.enum !== undefined) {
    if (!schema.enum.includes(data)) {
      fail(`must be one of [${schema.enum.map(v => JSON.stringify(v)).join(', ')}], got ${JSON.stringify(data)}`);
    }
  }

  // pattern (strings)
  if (schema.pattern !== undefined && typeof data === 'string') {
    if (!new RegExp(schema.pattern).test(data)) {
      fail(`must match pattern /${schema.pattern}/, got ${JSON.stringify(data)}`);
    }
  }

  // minimum (numbers/integers)
  if (schema.minimum !== undefined && typeof data === 'number') {
    if (data < schema.minimum) {
      fail(`must be >= ${schema.minimum}, got ${data}`);
    }
  }

  // object checks
  if (schema.type === 'object' && data !== null && typeof data === 'object' && !Array.isArray(data)) {
    // required
    if (schema.required) {
      for (const key of schema.required) {
        if (data[key] === undefined) {
          errors.push(`${path ? path + '.' : ''}${key}: required field is missing`);
        }
      }
    }

    // additionalProperties: false
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(data)) {
        if (!allowed.has(key)) {
          fail(`unknown property "${key}"`);
        }
      }
    }

    // properties
    if (schema.properties) {
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        if (data[key] !== undefined) {
          const sub = validate(subSchema, data[key], path ? `${path}.${key}` : key);
          errors.push(...sub);
        }
      }
    }

    // additionalProperties as schema (e.g. { type: 'string' })
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const defined = new Set(schema.properties ? Object.keys(schema.properties) : []);
      for (const [key, val] of Object.entries(data)) {
        if (!defined.has(key)) {
          const sub = validate(schema.additionalProperties, val, path ? `${path}.${key}` : key);
          errors.push(...sub);
        }
      }
    }
  }

  // array checks
  if (schema.type === 'array' && Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      fail(`must have at least ${schema.minItems} item(s), got ${data.length}`);
    }

    if (schema.items) {
      data.forEach((item, i) => {
        const sub = validate(schema.items, item, `${path}[${i}]`);
        errors.push(...sub);
      });
    }
  }

  return errors;
}
