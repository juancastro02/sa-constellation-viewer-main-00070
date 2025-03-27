export interface Location {
  latitude: number
  longitude: number
  name: string
}

export interface Star {
  id: string
  name?: string
  magnitude: number
  altitude: number
  azimuth: number
}

export interface ConstellationLine {
  start: Star
  end: Star
}

export interface Constellation {
  name: string
  lines: ConstellationLine[]
  center: {
    altitude: number
    azimuth: number
  }
}

export interface CelestialData {
  stars: Star[]
  constellations: Constellation[]
  time: Date
  location: Location
}

