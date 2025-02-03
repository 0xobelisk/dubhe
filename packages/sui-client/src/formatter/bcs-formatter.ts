// bcs-formatter.ts

import { bcs, BcsType } from '@mysten/sui/bcs';
import { SuiMoveNormalizedType, SuiMoveNormalizedStruct } from '@mysten/sui/client';

interface TypeMapping {
    [key: string]: () => BcsType<any, any>;
}

type SuiMoveNormalizedTypeVec = {
    Vector: SuiMoveNormalizedType;
};

export class BcsFormatter {
    private bcs: typeof bcs;

    constructor() {
        this.bcs = bcs;  
    }

    // Handle base types formatting
    private formatBaseType(type: string, value: unknown): Uint8Array {
        switch (type) {
            case 'Bool':
                return this.bcs.bool().serialize(value as boolean).toBytes();
            case 'U8':
                return this.bcs.u8().serialize(value as number).toBytes();
            case 'U16':
                return this.bcs.u16().serialize(value as number).toBytes();
            case 'U32':
                return this.bcs.u32().serialize(value as number).toBytes();
            case 'U64':
                return this.bcs.u64().serialize(value as string | number | bigint).toBytes();
            case 'U128':
                return this.bcs.u128().serialize(value as string | number | bigint).toBytes();
            case 'U256':
                return this.bcs.u256().serialize(value as string | number | bigint).toBytes();
            case 'Address':
                return this.bcs.Address.serialize(value as string).toBytes();
            default:
                throw new Error(`Unsupported base type: ${type}`);
        }
    }

    // Handle struct formatting
    private formatStruct(structType: { Struct: { address: string; module: string; name: string; typeArguments: string[] } }, value: Record<string, unknown>): Uint8Array {
        const { address, module, name } = structType.Struct;
        const structName = `${address}::${module}::${name}`;
        
        const fields: Record<string, BcsType<string, string>> = {};
        Object.keys(value).forEach(key => {
            fields[key] = this.bcs.string();
        });
        
        const bcsStruct = this.bcs.struct(structName, fields);
        return bcsStruct.serialize(value as Record<string, string>).toBytes();
    }

    // Handle vector formatting
    private formatVector(vectorType: SuiMoveNormalizedTypeVec, value: unknown[]): Uint8Array {
        const elementType = vectorType.Vector;
        
        // If element type is a struct, handle it recursively
        if (typeof elementType === 'object' && 'Struct' in elementType) {
            const structValues = value.map(v => 
                this.formatStruct(elementType as { Struct: { address: string; module: string; name: string; typeArguments: string[] } }, 
                v as Record<string, unknown>)
            );
            return this.bcs.vector(this.bcs.u8()).serialize(
                Buffer.concat(structValues.map(v => Buffer.from(v)))
            ).toBytes();
        }

        // Handle primitive types
        const typeMapping: TypeMapping = {
            'Bool': () => this.bcs.bool(),
            'U8': () => this.bcs.u8(),
            'U16': () => this.bcs.u16(),
            'U32': () => this.bcs.u32(),
            'U64': () => this.bcs.u64(),
            'U128': () => this.bcs.u128(),
            'U256': () => this.bcs.u256(),
            'Address': () => this.bcs.Address
        };
        
        const bcsType = typeMapping[elementType as string]?.() || this.bcs.string();
        return this.bcs.vector(bcsType).serialize(value).toBytes();
    }

    // Main format function
    public format(type: SuiMoveNormalizedType, value: unknown): Uint8Array {
        if (typeof type === 'string') {
            return this.formatBaseType(type, value);
        } else if ('Struct' in type) {
            return this.formatStruct(type as { Struct: { address: string; module: string; name: string; typeArguments: string[] } }, value as Record<string, unknown>);
        } else if ('Vector' in type) {
            return this.formatVector(type as SuiMoveNormalizedTypeVec, value as unknown[]);
        }
        
        throw new Error('Unsupported type format');
    }
}