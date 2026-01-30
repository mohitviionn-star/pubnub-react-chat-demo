export const dmChannel = (a: string, b: string) => {
  const [x, y] = [a, b].sort((p, q) => p.localeCompare(q));
  return `dm.${x}--${y}`;
};

export const typingSignal = (userId: string, on: boolean) =>
  `t:${userId}:${on ? 1 : 0}`;
