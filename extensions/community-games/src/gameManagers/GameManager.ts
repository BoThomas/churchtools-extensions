import { PersistanceCategory } from '@churchtools-extensions/persistance';
import type { Game, GameConfig, GameState } from '../stores/games';

export abstract class GameManager<
  TState extends GameState = GameState,
  TConfig extends GameConfig = GameConfig,
> {
  protected category!: PersistanceCategory<Game<TState, TConfig>>;
  protected categoryShorty: string;

  constructor(_extensionKey: string, categoryShorty: string) {
    this.categoryShorty = categoryShorty;
  }

  async init(extensionKey: string): Promise<void> {
    this.category = await PersistanceCategory.init({
      extensionkey: extensionKey,
      categoryShorty: this.categoryShorty,
    });
  }

  async getAll(): Promise<Game<TState, TConfig>[]> {
    const values = await this.category.list<Game<TState, TConfig>>();
    return values.map((v) => ({ ...v.value, id: v.id.toString() }));
  }

  async create(
    game: Omit<Game<TState, TConfig>, 'id'>,
  ): Promise<Game<TState, TConfig> | null> {
    try {
      const result = await this.category.create(game);
      return { ...game, id: result.id.toString() };
    } catch (e) {
      console.error('Failed to create game', e);
      return null;
    }
  }

  async update(
    gameId: string,
    game: Game<TState, TConfig>,
  ): Promise<Game<TState, TConfig> | null> {
    try {
      await this.category.update(parseInt(gameId), game);
      return game;
    } catch (e) {
      console.error('Failed to update game', e);
      return null;
    }
  }

  async delete(gameId: string): Promise<void> {
    await this.category.delete(parseInt(gameId));
  }

  abstract getDefaultState(): TState;
  abstract getDefaultConfig(): TConfig;
  abstract checkWinner(state: TState): 'red' | 'blue' | 'draw' | null;
}
