export const parseData = (data: any) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  const parsedData: any = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      // @ts-ignore
      const value = data[key];
      // console.log("===========", value)
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          parsedData[key] = handleArray(value);
        } else if (value.hasOwnProperty('variant')) {
          parsedData[key] = { [value.variant]: {} };
        } else if (value.hasOwnProperty('fields')) {
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

const handleArray = (data: any[]): any[] => {
  let returnData: any[] = [];
  data.forEach((item) => {
    if (typeof item === 'object' && item !== null) {
      if (Array.isArray(item)) {
        returnData.push(handleArray(item));
      } else if (item.hasOwnProperty('variant')) {
        returnData.push({ [item.variant]: {} });
      } else if (item.hasOwnProperty('fields')) {
        returnData.push(parseData(item.fields));
      } else {
        returnData.push(parseData(item));
      }
    } else {
      returnData.push(item);
    }
  });
  return returnData;
};
