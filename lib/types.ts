/**
 * Shared types for data structures.
 */

export type WeatherData = {
  temperature: number
  humidity: number
  windSpeed: number
  weatherCode: number
  time: string
  fetchedAt: string
}

export type FxPoint = {
  date: string
  value: number
}

export type FxData = {
  points: FxPoint[]
  latest: { date: string; value: number }
  min: number
  max: number
  source: string
  fetchedAt: string
}

