import { MoveType } from '../../types';
import fs from 'fs';

export function deleteFolderRecursive(path: string) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file) => {
      const curPath = `${path}/${file}`;
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

export function capitalizeFirstLetter(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

/**
 *
 * @param values
 * @param prefixArgs
 * @return [ name, age, birth_time ]
 */
export function getStructAttrs(values: Record<string, string> | string): string {
  return Object.entries(values)
    .map(([key, _]) => `${key}`)
    .join(',');
}

function isAddress(str: string): boolean {
  const regex = /^0x[a-fA-F0-9]+$/;
  return regex.test(str);
}

/**
 *
 * @param values
 * @return ( bool , u64 , u64)
 */
// export function getStructTypes(values: SchemaType): string {
export function getStructTypes(values: Record<string, string>): string {
  return `(${Object.entries(values).map(([_, type]) => `${type}`)})`;
}

/**
 *
 * @param values
 * @return Attributes and types of the struct. [ name: string, age: u64 ]
 */
export function getStructAttrsWithType(values: Record<string, string>): string[] {
  return Object.entries(values).map(([key, type]) => `${key}: ${type}`);
}

/**
 * @param values
 * @return [ data.name, data.age ]
 */
export function getStructAttrsQuery(values: Record<string, string>): string[] {
  return Object.entries(values).map(([key, _]) => `self.${key}`);
}

export function containsString(obj: Record<string, any>, searchString: string): boolean {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (
        (typeof value === 'string' && value === searchString) ||
        (typeof value === 'string' && value.includes(searchString) && value.includes('>'))
      ) {
        return true;
      }
    }
  }
  return false;
}
