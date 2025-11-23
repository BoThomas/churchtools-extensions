import { GameManager } from './GameManager';

export interface TicTacToeState {
  board: (string | null)[]; // 9 cells
}

export interface TicTacToeConfig {
  voteThreshold: number;
}

export class TicTacToeManager extends GameManager<
  TicTacToeState,
  TicTacToeConfig
> {
  constructor(extensionKey: string) {
    super(extensionKey, 'games-tictactoe');
  }

  getDefaultState(): TicTacToeState {
    return {
      board: Array(9).fill(null),
    };
  }

  getDefaultConfig(): TicTacToeConfig {
    return {
      voteThreshold: 1,
    };
  }

  checkWinner(state: TicTacToeState): 'red' | 'blue' | 'draw' | null {
    const board = state.board;
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

    // Check for draw
    if (board.every((cell) => cell !== null)) {
      return 'draw';
    }

    return null;
  }

  isMoveLegal(
    state: TicTacToeState,
    moveIndex: number,
    _team: 'red' | 'blue',
  ): boolean {
    // Check if index is valid
    if (moveIndex < 0 || moveIndex >= 9) {
      return false;
    }
    // Check if cell is empty
    return state.board[moveIndex] === null;
  }
}
