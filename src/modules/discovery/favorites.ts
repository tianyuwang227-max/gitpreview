import fs from 'fs/promises';
import path from 'path';
import { FavoriteProject, Project } from './types';
import { logger } from '../../utils/logger';

const FAVORITES_FILE = path.join(process.cwd(), 'data', 'favorites.json');

export class FavoritesManager {
  private favorites: Map<string, FavoriteProject> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await fs.readFile(FAVORITES_FILE, 'utf-8');
      const favorites = JSON.parse(data) as FavoriteProject[];
      for (const fav of favorites) {
        this.favorites.set(fav.project.fullName, fav);
      }
      logger.info(`Loaded ${favorites.length} favorites`);
    } catch {
      logger.info('No favorites found, starting fresh');
    }

    this.initialized = true;
  }

  async addFavorite(project: Project, notes?: string): Promise<void> {
    await this.init();

    this.favorites.set(project.fullName, {
      project,
      addedAt: new Date().toISOString(),
      notes,
    });

    await this.persist();
    logger.info(`Added favorite: ${project.fullName}`);
  }

  async removeFavorite(fullName: string): Promise<boolean> {
    await this.init();

    const removed = this.favorites.delete(fullName);
    if (removed) {
      await this.persist();
      logger.info(`Removed favorite: ${fullName}`);
    }
    return removed;
  }

  isFavorite(fullName: string): boolean {
    return this.favorites.has(fullName);
  }

  getFavorite(fullName: string): FavoriteProject | undefined {
    return this.favorites.get(fullName);
  }

  async getAllFavorites(): Promise<FavoriteProject[]> {
    await this.init();
    return Array.from(this.favorites.values())
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }

  async updateNotes(fullName: string, notes: string): Promise<boolean> {
    await this.init();

    const fav = this.favorites.get(fullName);
    if (fav) {
      fav.notes = notes;
      await this.persist();
      return true;
    }
    return false;
  }

  private async persist(): Promise<void> {
    try {
      const data = JSON.stringify(Array.from(this.favorites.values()), null, 2);
      await fs.mkdir(path.dirname(FAVORITES_FILE), { recursive: true });
      await fs.writeFile(FAVORITES_FILE, data, 'utf-8');
    } catch (error) {
      logger.error('Failed to persist favorites', { error });
    }
  }
}

export const favoritesManager = new FavoritesManager();
