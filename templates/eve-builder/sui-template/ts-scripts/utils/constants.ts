import * as fs from 'node:fs';
import * as path from 'node:path';

// Sui System Objects
export const CLOCK_OBJECT_ID = '0x6';

export const TENANT = process.env.TENANT || 'dev';

// Load test resource defaults from JSON (builders can customize this file)
type TestResources = {
  locationHash: string;
  character: { gameCharacterId: number; gameCharacterBId: number };
  networkNode: { typeId: number; itemId: number };
  assembly: { typeId: number; itemId: number };
  storageUnit: { typeId: number; itemId: number };
  gate: { typeId: number; itemId1: number; itemId2: number };
  item: { typeId: number; itemId: number };
};

function loadTestResources(): TestResources {
  const filePath = path.resolve(process.cwd(), 'test-resources.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing ${filePath}. Copy test-resources.json from world-contracts after running create-test-resources.`
    );
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as TestResources;
  } catch (err) {
    throw new Error(`Failed to parse ${filePath}: ${err instanceof Error ? err.message : err}`);
  }
}

const res = loadTestResources();

// Location
export const LOCATION_HASH = res.locationHash;

// Character
export const GAME_CHARACTER_ID = res.character.gameCharacterId;
export const GAME_CHARACTER_B_ID = res.character.gameCharacterBId;

// Network Node
export const NWN_TYPE_ID = BigInt(res.networkNode.typeId);
export const NWN_ITEM_ID = BigInt(res.networkNode.itemId);

// Assembly
export const ASSEMBLY_TYPE_ID = BigInt(res.assembly.typeId);
export const ASSEMBLY_ITEM_ID = BigInt(res.assembly.itemId);

// Storage Unit
export const STORAGE_A_TYPE_ID = BigInt(res.storageUnit.typeId);
export const STORAGE_A_ITEM_ID = BigInt(res.storageUnit.itemId);

// Gate
export const GATE_TYPE_ID = BigInt(res.gate.typeId);
export const GATE_ITEM_ID_1 = BigInt(res.gate.itemId1);
export const GATE_ITEM_ID_2 = BigInt(res.gate.itemId2);

// Item
export const ITEM_A_TYPE_ID = BigInt(res.item.typeId);
export const ITEM_A_ITEM_ID = BigInt(res.item.itemId);
