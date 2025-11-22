import { GameManager } from './GameManager';

export interface ConnectFourState {
  board: (string | null)[]; // 42 cells (7 columns x 6 rows)
}

export interface ConnectFourConfig {
  voteThreshold: number;
}

export class ConnectFourManager extends GameManager<
  ConnectFourState,
  ConnectFourConfig
> {
  private readonly ROWS = 6;
  private readonly COLS = 7;

  constructor(extensionKey: string) {
    super(extensionKey, 'games-connectfour');
  }

  getDefaultState(): ConnectFourState {
    return {
      board: Array(this.ROWS * this.COLS).fill(null),
    };
  }

  getDefaultConfig(): ConnectFourConfig {
    return {
      voteThreshold: 1,
    };
  }

  checkWinner(state: ConnectFourState): 'red' | 'blue' | 'draw' | null {
    const board = state.board;

    // Check for four in a row (horizontal, vertical, diagonal)
    const winner = this.checkFourInARow(board);
    if (winner) return winner;

    // Check for draw (board full)
    if (board.every((cell) => cell !== null)) {
      return 'draw';
    }

    return null;
  }

  private checkFourInARow(board: (string | null)[]): 'red' | 'blue' | null {
    // Helper to get cell value
    const getCell = (row: number, col: number): string | null => {
      if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS)
        return null;
      return board[row * this.COLS + col];
    };

    // Check all possible winning positions
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        const cell = getCell(row, col);
        if (!cell) continue;

        // Check horizontal (right)
        if (
          col <= this.COLS - 4 &&
          cell === getCell(row, col + 1) &&
          cell === getCell(row, col + 2) &&
          cell === getCell(row, col + 3)
        ) {
          return cell as 'red' | 'blue';
        }

        // Check vertical (down)
        if (
          row <= this.ROWS - 4 &&
          cell === getCell(row + 1, col) &&
          cell === getCell(row + 2, col) &&
          cell === getCell(row + 3, col)
        ) {
          return cell as 'red' | 'blue';
        }

        // Check diagonal (down-right)
        if (
          row <= this.ROWS - 4 &&
          col <= this.COLS - 4 &&
          cell === getCell(row + 1, col + 1) &&
          cell === getCell(row + 2, col + 2) &&
          cell === getCell(row + 3, col + 3)
        ) {
          return cell as 'red' | 'blue';
        }

        // Check diagonal (down-left)
        if (
          row <= this.ROWS - 4 &&
          col >= 3 &&
          cell === getCell(row + 1, col - 1) &&
          cell === getCell(row + 2, col - 2) &&
          cell === getCell(row + 3, col - 3)
        ) {
          return cell as 'red' | 'blue';
        }
      }
    }

    return null;
  }
}
