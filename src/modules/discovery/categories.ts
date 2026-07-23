import { Category } from './types';
import { logger } from '../../utils/logger';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'web-frameworks',
    name: 'Web Frameworks',
    description: 'Frontend and backend web frameworks',
    icon: '🌐',
    count: 0,
  },
  {
    id: 'mobile',
    name: 'Mobile Apps',
    description: 'iOS, Android, and cross-platform mobile apps',
    icon: '📱',
    count: 0,
  },
  {
    id: 'cli-tools',
    name: 'CLI Tools',
    description: 'Command line tools and utilities',
    icon: '💻',
    count: 0,
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Machine learning, data analysis, and visualization',
    icon: '📊',
    count: 0,
  },
  {
    id: 'devops',
    name: 'DevOps',
    description: 'CI/CD, containers, and infrastructure tools',
    icon: '🔧',
    count: 0,
  },
  {
    id: 'games',
    name: 'Games',
    description: 'Game engines and game projects',
    icon: '🎮',
    count: 0,
  },
  {
    id: 'api',
    name: 'APIs & Services',
    description: 'REST APIs, GraphQL, and microservices',
    icon: '🔌',
    count: 0,
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Security tools and libraries',
    icon: '🔒',
    count: 0,
  },
];

export const CATEGORY_TOPICS: Record<string, string[]> = {
  'web-frameworks': ['react', 'vue', 'angular', 'svelte', 'nextjs', 'express', 'django', 'flask'],
  'mobile': ['react-native', 'flutter', 'swift', 'kotlin', 'ios', 'android'],
  'cli-tools': ['cli', 'terminal', 'command-line', 'shell'],
  'data-science': ['machine-learning', 'deep-learning', 'data-science', 'tensorflow', 'pytorch'],
  'devops': ['docker', 'kubernetes', 'ci-cd', 'terraform', 'ansible'],
  'games': ['game-engine', 'unity', 'unreal', 'godot'],
  'api': ['rest-api', 'graphql', 'microservices', 'api'],
  'security': ['security', 'cryptography', 'penetration-testing'],
};

export function getCategories(): Category[] {
  return DEFAULT_CATEGORIES;
}

export function getCategoryByTopic(topic: string): Category | undefined {
  return DEFAULT_CATEGORIES.find(cat =>
    CATEGORY_TOPICS[cat.id]?.includes(topic)
  );
}
