export interface Mission {
  text: string;
  destroy?: string;
  neighbours?: number;
  continents: { id: string; countries: number } [];
}
