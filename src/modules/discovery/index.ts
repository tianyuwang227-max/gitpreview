import { getTrending, getRepoDetails } from './github';
import { getCategories } from './categories';
import { favoritesManager } from './favorites';
import { Project, Category, FavoriteProject } from './types';
import { logger } from '../../utils/logger';

export { searchProjects, getTrending, getRepoDetails, getReposByTopic, getReposByLanguage } from './github';
export { getCategories, getCategoryByTopic } from './categories';
export { favoritesManager } from './favorites';
export type {
  Project,
  SearchResult,
  Category,
  FavoriteProject,
  SortOption,
  OrderOption,
} from './types';

export async function getDiscoveryData(): Promise<{
  trending: Project[];
  categories: Category[];
  favorites: FavoriteProject[];
}> {
  logger.info('Getting discovery data');

  const [trending, categories, favorites] = await Promise.all([
    getTrending(),
    getCategories(),
    favoritesManager.getAllFavorites(),
  ]);

  return {
    trending,
    categories,
    favorites,
  };
}

export async function addToFavorites(fullName: string, notes?: string): Promise<void> {
  const [owner, repo] = fullName.split('/');
  const project = await getRepoDetails(owner, repo);
  await favoritesManager.addFavorite(project, notes);
}

export async function removeFromFavorites(fullName: string): Promise<boolean> {
  return favoritesManager.removeFavorite(fullName);
}

export async function isFavorite(fullName: string): Promise<boolean> {
  await favoritesManager.init();
  return favoritesManager.isFavorite(fullName);
}
