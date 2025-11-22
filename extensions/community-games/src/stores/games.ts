import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { PersistanceCategory } from '@churchtools-extensions/persistance';
import { KEY } from '../config';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';

export type GameType = 'tictactoe';

export interface GameConfig {
  voteThreshold: number; // Number of votes needed to confirm a move
}

export interface GameState {
  board: (string | null)[]; // 9 cells for TicTacToe
}

export interface Game {
  id: string; // This will be the persistence ID
  type: GameType;
  name: string;
  status: 'lobby' | 'active' | 'finished';
  teams: {
    red: number[]; // User IDs
    blue: number[]; // User IDs
  };
  state: GameState;
  config: GameConfig;
  votes: Record<string, number>; // userId -> move index
  currentTurn: 'red' | 'blue';
  winner?: 'red' | 'blue' | 'draw';
  createdAt: string;
}

export const useGamesStore = defineStore('games', () => {
  const games = ref<Game[]>([]);
  const initializing = ref(true);
  const currentUser = ref<Person | null>(null);

  // Persistence categories
  const tictactoeCategory = new PersistanceCategory<Game>(
    KEY,
    'games-tictactoe',
  );

  const activeGames = computed(() =>
    games.value.filter((g: Game) => g.status !== 'finished'),
  );

  async function init() {
    initializing.value = true;
    try {
      // Load user
      currentUser.value = await churchtoolsClient.get<Person>('/whoami');

      // Load games
      const tictactoeGames = await tictactoeCategory.getAll();
      games.value = [...tictactoeGames];
    } catch (e) {
      console.error('Failed to init games store', e);
    } finally {
      initializing.value = false;
    }
  }

  async function createGame(name: string, type: GameType, config: GameConfig) {
    const newGame: Omit<Game, 'id'> = {
      type,
      name,
      status: 'lobby',
      teams: { red: [], blue: [] },
      state: { board: Array(9).fill(null) },
      config,
      votes: {},
      currentTurn: 'red', // Red starts
      createdAt: new Date().toISOString(),
    };

    if (type === 'tictactoe') {
      const savedGame = await tictactoeCategory.create(newGame);
      if (savedGame) {
        games.value.push(savedGame);
      }
      return savedGame;
    }
    return null;
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
    if (game.type === 'tictactoe') {
      const updated = await tictactoeCategory.update(game.id, game);
      if (updated) {
        games.value[gameIndex] = updated;
      }
    }
  }

  async function startGame(gameId: string) {
    const gameIndex = games.value.findIndex((g: Game) => g.id === gameId);
    if (gameIndex === -1) return;

    const game = games.value[gameIndex];
    game.status = 'active';

    if (game.type === 'tictactoe') {
      const updated = await tictactoeCategory.update(game.id, game);
      if (updated) {
        games.value[gameIndex] = updated;
      }
    }
  }

  async function deleteGame(gameId: string) {
    const gameIndex = games.value.findIndex((g: Game) => g.id === gameId);
    if (gameIndex === -1) return;

    const game = games.value[gameIndex];
    if (game.type === 'tictactoe') {
      await tictactoeCategory.delete(game.id);
      games.value.splice(gameIndex, 1);
    }
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
    const teamSize = game.teams[userTeam].length;
    const votesForMove = Object.values(game.votes).filter(
      (v) => v === moveIndex,
    ).length;

    // Simple logic: if votes reach threshold, make the move
    if (votesForMove >= game.config.voteThreshold) {
      await makeMove(game, moveIndex, userTeam);
    } else {
      // Just save the vote
      if (game.type === 'tictactoe') {
        const updated = await tictactoeCategory.update(game.id, game);
        if (updated) {
          games.value[gameIndex] = updated;
        }
      }
    }
  }

  async function makeMove(game: Game, moveIndex: number, team: 'red' | 'blue') {
    // Apply move
    game.state.board[moveIndex] = team;

    // Clear votes
    game.votes = {};

    // Check win condition
    const winner = checkWinner(game.state.board);
    if (winner) {
      game.winner = winner;
      game.status = 'finished';
    } else if (game.state.board.every((cell) => cell !== null)) {
      game.winner = 'draw';
      game.status = 'finished';
    } else {
      // Switch turn
      game.currentTurn = team === 'red' ? 'blue' : 'red';
    }

    // Save
    if (game.type === 'tictactoe') {
      const updated = await tictactoeCategory.update(game.id, game);
      // Update local state
      const idx = games.value.findIndex((g: Game) => g.id === game.id);
      if (idx !== -1) games.value[idx] = updated!;
    }
  }

  function checkWinner(board: (string | null)[]): 'red' | 'blue' | null {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // cols
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as 'red' | 'blue';
      }
    }
    return null;
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
