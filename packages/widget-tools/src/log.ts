const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const paint = (code: number, text: string) =>
  useColor ? `\u001b[${code}m${text}\u001b[0m` : text;

export const log = {
  info: (message: string) => console.log(message),
  success: (message: string) => console.log(paint(32, `✓ ${message}`)),
  warn: (message: string) => console.warn(paint(33, `! ${message}`)),
  error: (message: string) => console.error(paint(31, `✗ ${message}`)),
  dim: (message: string) => console.log(paint(2, message)),
};
