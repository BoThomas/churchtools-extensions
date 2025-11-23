import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { KEY } from '../config';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import { GameManager } from '../gameManagers/GameManager';
import { TicTacToeManager } from '../gameManagers/TicTacToeManager';
import { ConnectFourManager } from '../gameManagers/ConnectFourManager';

export type GameType = 'tictactoe' | 'connectfour';

// Centralized game type configuration
export const GAME_TYPES = [
  { label: 'Tic Tac Toe', value: 'tictactoe' as GameType },
  { label: 'Connect Four', value: 'connectfour' as GameType },
];

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
  const refreshing = ref(false);
  const currentUser = ref<Person | null>(null);

  // Game managers registry
  const managers = new Map<GameType, GameManager>();

  const activeGames = computed(() =>
    games.value.filter((g: Game) => g.status !== 'finished'),
  );

  const finishedGames = computed(() =>
    games.value.filter((g: Game) => g.status === 'finished'),
  );

  function getManager(type: GameType): GameManager {
    const manager = managers.get(type);
    if (!manager) {
      throw new Error(`No manager found for game type: ${type}`);
    }
    return manager;
  }

  async function init() {
    const isInitialLoad = initializing.value;
    if (isInitialLoad) {
      initializing.value = true;
    } else {
      refreshing.value = true;
    }
    try {
      // Load user
      currentUser.value = await churchtoolsClient.get<Person>('/whoami');

      // Initialize managers
      const tictactoeManager = new TicTacToeManager(KEY);
      await tictactoeManager.init(KEY);
      managers.set('tictactoe', tictactoeManager);

      const connectfourManager = new ConnectFourManager(KEY);
      await connectfourManager.init(KEY);
      managers.set('connectfour', connectfourManager);

      // Load games from all managers
      const tictactoeGames = await tictactoeManager.getAll();
      const connectfourGames = await connectfourManager.getAll();
      games.value = [...tictactoeGames, ...connectfourGames];
    } catch (e) {
      console.error('Failed to init games store', e);
    } finally {
      initializing.value = false;
      refreshing.value = false;
    }
  }

  async function fetchAllUsers(): Promise<Person[]> {
    try {
      // ChurchTools API returns persons directly as an array
      const persons = await churchtoolsClient.get<Person[]>('/persons');
      return persons || [];
    } catch (e) {
      console.error('Failed to fetch users', e);
      return [];
    }
  }

  function divideIntoTeams(userIds: number[]): {
    red: number[];
    blue: number[];
  } {
    // Shuffle array randomly
    const shuffled = [...userIds].sort(() => Math.random() - 0.5);

    // Divide into two roughly equal teams
    const midpoint = Math.ceil(shuffled.length / 2);
    return {
      red: shuffled.slice(0, midpoint),
      blue: shuffled.slice(midpoint),
    };
  }

  async function createGame(name: string, type: GameType, config: GameConfig) {
    const manager = getManager(type);

    // Fetch all users and divide into teams
    const allUsers = await fetchAllUsers();
    const userIds = allUsers.map((user) => user.id);
    const teams = divideIntoTeams(userIds);

    const newGame: Omit<Game, 'id'> = {
      type,
      name,
      status: 'active', // Start game immediately after creation
      teams, // Use automatically divided teams
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

  // joinGame removed - teams are now automatically assigned at game creation

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

  async function closeGame(gameId: string) {
    const gameIndex = games.value.findIndex((g: Game) => g.id === gameId);
    if (gameIndex === -1) return;

    const game = games.value[gameIndex];
    game.status = 'finished';
    game.winner = undefined; // No winner

    const manager = getManager(game.type);
    const updated = await manager.update(game.id, game);
    if (updated) {
      games.value[gameIndex] = updated;
    }
  }

  async function castVote(gameId: string, moveIndex: number) {
    if (!currentUser.value) return;

    // Always refresh game state from server before processing vote
    const manager = getManager(
      games.value.find((g) => g.id === gameId)?.type || 'tictactoe',
    );
    const freshGame = await manager.getById(gameId);

    if (!freshGame) {
      console.error('Game not found');
      return;
    }

    // Update local state with fresh data
    const gameIndex = games.value.findIndex((g: Game) => g.id === gameId);
    if (gameIndex !== -1) {
      games.value[gameIndex] = freshGame;
    }

    // Check if game is still active
    if (freshGame.status !== 'active' || freshGame.winner) {
      console.log('Game is no longer active');
      return;
    }

    // Check if it's user's turn
    const userTeam = freshGame.teams.red.includes(currentUser.value.id)
      ? 'red'
      : freshGame.teams.blue.includes(currentUser.value.id)
        ? 'blue'
        : null;

    if (!userTeam || userTeam !== freshGame.currentTurn) {
      console.log('Not your turn or turn changed');
      return;
    }

    // Validate move is still legal
    if (!manager.isMoveLegal(freshGame.state, moveIndex, userTeam)) {
      console.log('Move is no longer legal');
      return;
    }

    // Record vote
    freshGame.votes[currentUser.value.id.toString()] = moveIndex;

    // Check threshold
    const votesForMove = Object.values(freshGame.votes).filter(
      (v) => v === moveIndex,
    ).length;

    // Simple logic: if votes reach threshold, make the move
    if (votesForMove >= freshGame.config.voteThreshold) {
      await makeMove(freshGame, moveIndex, userTeam);
    } else {
      // Just save the vote
      const updated = await manager.update(freshGame.id, freshGame);
      if (updated && gameIndex !== -1) {
        games.value[gameIndex] = updated;
      }
    }
  }

  async function makeMove(game: Game, moveIndex: number, team: 'red' | 'blue') {
    const manager = getManager(game.type);

    // Apply move based on game type
    if (game.state.board) {
      if (game.type === 'connectfour') {
        // For Connect Four, moveIndex is the column
        // Find the lowest available row in that column
        const ROWS = 6;
        const COLS = 7;
        const col = moveIndex;

        for (let row = ROWS - 1; row >= 0; row--) {
          const index = row * COLS + col;
          if (game.state.board[index] === null) {
            game.state.board[index] = team;
            break;
          }
        }
      } else {
        // For TicTacToe and other games, moveIndex is the cell index
        game.state.board[moveIndex] = team;
      }
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

  async function deleteAllFinishedGames() {
    const finishedGamesList = games.value.filter(
      (g: Game) => g.status === 'finished',
    );

    for (const game of finishedGamesList) {
      const manager = getManager(game.type);
      await manager.delete(game.id);
    }

    games.value = games.value.filter((g: Game) => g.status !== 'finished');
  }

  return {
    games,
    activeGames,
    finishedGames,
    initializing,
    refreshing,
    currentUser,
    init,
    createGame,
    startGame,
    deleteGame,
    closeGame,
    deleteAllFinishedGames,
    castVote,
  };
});
