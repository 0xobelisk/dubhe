export const parseData = (data: unknown): unknown => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => parseData(item));
  }

  const parsedData: Record<string, unknown> = {};
  for (const key in data as object) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = (data as Record<string, unknown>)[key];

      if (typeof value === 'object' && value !== null) {
        if ('variant' in value) {
          parsedData[key] = value.variant;
        } else if ('fields' in value) {
          parsedData[key] = parseData(value.fields);
        } else {
          parsedData[key] = parseData(value);
        }
      } else {
        parsedData[key] = value;
      }
    }
  }
  return parsedData;
};

export const parseValue = (value: unknown): unknown => {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => parseValue(item));
  }

  if ('variant' in value) {
    return value.variant;
  }

  if ('fields' in value) {
    return parseData(value.fields);
  }

  return parseData(value);
};
