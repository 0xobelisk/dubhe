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
    path: '101/{chain}-template'
  },
  WEB: {
    title: 'Web',
    description: 'Web template',
    value: 'web',
    path: 'nextjs/{chain}-template'
  },
  CONTRACT: {
    title: 'Contract',
    description: 'Contract template',
    value: 'contract',
    path: 'contract/{chain}-template'
  }
} as const;

export const CHAINS: Chain[] = [
  {
    title: 'sui',
    description: 'Sui',
    value: 'sui',
    supportedTemplates: [TEMPLATES.QUICK_START, TEMPLATES.WEB, TEMPLATES.CONTRACT]
  },
  {
    title: 'aptos',
    description: 'Aptos',
    value: 'aptos',
    supportedTemplates: [TEMPLATES.QUICK_START, TEMPLATES.WEB, TEMPLATES.CONTRACT]
  },
  {
    title: 'rooch',
    description: 'Rooch',
    value: 'rooch',
    supportedTemplates: [TEMPLATES.QUICK_START]
  },
  {
    title: 'initia',
    description: 'Initia',
    value: 'initia',
    supportedTemplates: [TEMPLATES.QUICK_START]
  },
  {
    title: 'movement',
    description: 'Movement',
    value: 'movement',
    supportedTemplates: [TEMPLATES.QUICK_START]
  }
];
