import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { KEY } from '../config';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import { GameManager } from '../gameManagers/GameManager';
import { TicTacToeManager } from '../gameManagers/TicTacToeManager';

export type GameType = 'tictactoe';

export interface GameConfig {
  voteThreshold: number; // Number of votes needed to confirm a move
}

export interface GameState {
  board?: (string | null)[]; // 9 cells for TicTacToe (optional for extensibility)
}

export interface Game<
  TState extends GameState = GameState,
  TConfig extends GameConfig = GameConfig,
> {
  id: string; // This will be the persistence ID
  type: GameType;
  name: string;
  status: 'lobby' | 'active' | 'finished';
  teams: {
    red: number[]; // User IDs
    blue: number[]; // User IDs
  };
  state: TState;
  config: TConfig;
  votes: Record<string, number>; // userId -> move index
  currentTurn: 'red' | 'blue';
  winner?: 'red' | 'blue' | 'draw';
  createdAt: string;
}

export const useGamesStore = defineStore('games', () => {
  const games = ref<Game[]>([]);
  const initializing = ref(true);
  const currentUser = ref<Person | null>(null);

  // Game managers registry
  const managers = new Map<GameType, GameManager>();

  const activeGames = computed(() =>
    games.value.filter((g: Game) => g.status !== 'finished'),
  );

  function getManager(type: GameType): GameManager {
    const manager = managers.get(type);
    if (!manager) {
      throw new Error(`No manager found for game type: ${type}`);
    }
    return manager;
  }

  async function init() {
    initializing.value = true;
    try {
      // Load user
      currentUser.value = await churchtoolsClient.get<Person>('/whoami');

      // Initialize managers
      const tictactoeManager = new TicTacToeManager(KEY);
      await tictactoeManager.init(KEY);
      managers.set('tictactoe', tictactoeManager);

      // Load games from all managers
      const tictactoeGames = await tictactoeManager.getAll();
      games.value = [...tictactoeGames];
    } catch (e) {
      console.error('Failed to init games store', e);
    } finally {
      initializing.value = false;
    }
  }

  async function createGame(name: string, type: GameType, config: GameConfig) {
    const manager = getManager(type);
    const newGame: Omit<Game, 'id'> = {
      type,
      name,
      status: 'lobby',
      teams: { red: [], blue: [] },
      state: manager.getDefaultState(),
      config: config ?? manager.getDefaultConfig(),
      votes: {},
      currentTurn: 'red', // Red starts
      createdAt: new Date().toISOString(),
    };

    const savedGame = await manager.create(newGame);
    if (savedGame) {
      games.value.push(savedGame);
    }
    return savedGame;
  }

  async function joinGame(gameId: string, team: 'red' | 'blue') {
    const gameIndex = games.value.findIndex((g) => g.id === gameId);
    if (gameIndex === -1 || !currentUser.value) return;

    const game = games.value[gameIndex];

    // Remove from other team if present
    game.teams.red = game.teams.red.filter(
      (id: number) => id !== currentUser.value!.id,
    );
    game.teams.blue = game.teams.blue.filter(
      (id: number) => id !== currentUser.value!.id,
    );

    // Add to new team
    game.teams[team].push(currentUser.value.id);

    // Update persistence
    const manager = getManager(game.type);
    const updated = await manager.update(game.id, game);
    if (updated) {
      games.value[gameIndex] = updated;
    }
  }

  async function startGame(gameId: string) {
    const gameIndex = games.value.findIndex((g: Game) => g.id === gameId);
    if (gameIndex === -1) return;

    const game = games.value[gameIndex];
    game.status = 'active';

    const manager = getManager(game.type);
    const updated = await manager.update(game.id, game);
    if (updated) {
      games.value[gameIndex] = updated;
    }
  }

  async function deleteGame(gameId: string) {
    const gameIndex = games.value.findIndex((g: Game) => g.id === gameId);
    if (gameIndex === -1) return;

    const game = games.value[gameIndex];
    const manager = getManager(game.type);
    await manager.delete(game.id);
    games.value.splice(gameIndex, 1);
  }

  async function castVote(gameId: string, moveIndex: number) {
    const gameIndex = games.value.findIndex((g: Game) => g.id === gameId);
    if (gameIndex === -1 || !currentUser.value) return;

    const game = games.value[gameIndex];

    // Check if it's user's turn
    const userTeam = game.teams.red.includes(currentUser.value.id)
      ? 'red'
      : game.teams.blue.includes(currentUser.value.id)
        ? 'blue'
        : null;

    if (!userTeam || userTeam !== game.currentTurn) return;

    // Record vote
    game.votes[currentUser.value.id.toString()] = moveIndex;

    // Check threshold
    const votesForMove = Object.values(game.votes).filter(
      (v) => v === moveIndex,
    ).length;

    // Simple logic: if votes reach threshold, make the move
    if (votesForMove >= game.config.voteThreshold) {
      await makeMove(game, moveIndex, userTeam);
    } else {
      // Just save the vote
      const manager = getManager(game.type);
      const updated = await manager.update(game.id, game);
      if (updated) {
        games.value[gameIndex] = updated;
      }
    }
  }

  async function makeMove(game: Game, moveIndex: number, team: 'red' | 'blue') {
    const manager = getManager(game.type);

    // Apply move (type-safe for tictactoe)
    if (game.state.board) {
      game.state.board[moveIndex] = team;
    }

    // Clear votes
    game.votes = {};

    // Check win condition
    const winner = manager.checkWinner(game.state);
    if (winner) {
      game.winner = winner;
      game.status = 'finished';
    } else {
      // Switch turn
      game.currentTurn = team === 'red' ? 'blue' : 'red';
    }

    // Save
    const updated = await manager.update(game.id, game);
    // Update local state
    const idx = games.value.findIndex((g: Game) => g.id === game.id);
    if (idx !== -1 && updated) games.value[idx] = updated;
  }

  return {
    games,
    activeGames,
    initializing,
    currentUser,
    init,
    createGame,
    joinGame,
    startGame,
    deleteGame,
    castVote,
  };
});
