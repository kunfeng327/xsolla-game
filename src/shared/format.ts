export const formatTime = (t: number) =>
  `${Math.floor(Math.max(0, t) / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(Math.max(0, t) % 60)
    .toString()
    .padStart(2, '0')}`;
