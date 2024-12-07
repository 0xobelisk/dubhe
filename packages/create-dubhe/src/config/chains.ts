interface Template {
	title: string;
	description: string;
	value: string;
	path: string;
}

interface Chain {
	title: string;
	description: string;
	value: string;
	supportedTemplates: Template[];
}

const TEMPLATES = {
	QUICK_START: {
		title: '101',
		description: 'Quick start',
		value: '101',
		path: 'template/101/{chain}-template',
	},
	WEB: {
		title: 'Web',
		description: 'Web template',
		value: 'web',
		path: 'template/nextjs/{chain}-template',
	},
	CONTRACT: {
		title: 'Contract',
		description: 'Contract template',
		value: 'contract',
		path: 'template/contract/{chain}-template',
	},
	COCOS: {
		title: 'Cocos',
		description: 'Cocos Creator',
		value: 'cocos',
		path: 'template/cocos/{chain}-template',
	},
} as const;

export const CHAINS: Chain[] = [
	{
		title: 'sui',
		description: 'Sui',
		value: 'sui',
		supportedTemplates: [
			TEMPLATES.QUICK_START,
			TEMPLATES.WEB,
			TEMPLATES.CONTRACT,
			TEMPLATES.COCOS,
		],
	},
	{
		title: 'aptos',
		description: 'Aptos',
		value: 'aptos',
		supportedTemplates: [
			TEMPLATES.QUICK_START,
			TEMPLATES.WEB,
			TEMPLATES.CONTRACT,
			TEMPLATES.COCOS,
		],
	},
	{
		title: 'rooch',
		description: 'Rooch',
		value: 'rooch',
		supportedTemplates: [TEMPLATES.QUICK_START],
	},
	{
		title: 'initia',
		description: 'Initia',
		value: 'initia',
		supportedTemplates: [TEMPLATES.QUICK_START],
	},
	{
		title: 'movement',
		description: 'Movement',
		value: 'movement',
		supportedTemplates: [TEMPLATES.QUICK_START],
	},
];
