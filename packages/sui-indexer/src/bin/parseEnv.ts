import { Hex, isHex } from 'viem';
import { z, ZodError, ZodTypeAny } from 'zod';

export const frontendEnvSchema = z.object({
	HOST: z.string().default('0.0.0.0'),
	PORT: z.coerce.number().positive().default(3001),
});

function isHexOrUndefined(input: unknown): input is Hex | undefined {
	return input === undefined || isHex(input);
}

export const indexerEnvSchema = z.intersection(
	z.object({
		NETWORK: z.enum(['localnet', 'testnet', 'mainnet']).default('localnet'),
		FOLLOW_BLOCK_TAG: z
			.enum(['latest', 'safe', 'finalized'])
			.default('safe'),
		START_BLOCK: z.coerce.bigint().nonnegative().default(0n),
		MAX_BLOCK_RANGE: z.coerce.bigint().positive().default(1000n),
		POLLING_INTERVAL: z.coerce.number().positive().default(1000),
		SCHEMA_ID: z.string().min(1, { message: 'SCHEMA_ID is required' }),
		SYNC_LIMIT_PER_TIME: z.coerce.number().nonnegative().default(100),
		STORE_ADDRESS: z
			.string()
			.optional()
			.transform(input => (input === '' ? undefined : input))
			.refine(isHexOrUndefined),
		DEFAULT_PAGE_SIZE: z.coerce.number().optional().default(10),
		PAGINATION_LIMIT: z.coerce.number().optional().default(100),
	}),
	z.union([
		z.object({
			RPC_HTTP_URL: z.string(),
			RPC_WS_URL: z.string().optional(),
		}),
		z.object({
			RPC_HTTP_URL: z.string().optional(),
			RPC_WS_URL: z.string(),
		}),
	])
);

export function parseEnv<TSchema extends ZodTypeAny>(
	envSchema: TSchema
): z.infer<TSchema> {
	try {
		return envSchema.parse(process.env);
	} catch (error) {
		if (error instanceof ZodError) {
			const { ...invalidEnvVars } = error.format();
			console.error(
				`\nMissing or invalid environment variables:\n\n  ${Object.keys(
					invalidEnvVars
				).join('\n  ')}\n`
			);
			process.exit(1);
		}
		throw error;
	}
}
