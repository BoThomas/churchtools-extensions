import chalk from 'chalk';

export const logger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.log(chalk.red('✖'), msg),
  secret: (msg: string) => console.log(chalk.magenta('🔐'), msg),
  step: (msg: string) => console.log(chalk.cyan('→'), msg),
  blank: () => console.log(),
  box: (title: string, content: string[]) => {
    const width = Math.max(title.length, ...content.map((c) => c.length)) + 4;
    const border = '═'.repeat(width);
    console.log(chalk.yellow(`╔${border}╗`));
    console.log(chalk.yellow(`║  ${title.padEnd(width - 2)}║`));
    console.log(chalk.yellow(`╠${border}╣`));
    for (const line of content) {
      console.log(chalk.yellow(`║  ${line.padEnd(width - 2)}║`));
    }
    console.log(chalk.yellow(`╚${border}╝`));
  },
};
