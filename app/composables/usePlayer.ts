/** Name typed by the person who is playing; goes into the history. Free text, no profiles. */
export const usePlayer = () => useState<string>('player', () => '')
