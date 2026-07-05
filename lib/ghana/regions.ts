export type Town = {
  /**
   * “Town/Area” under a developed municipality.
   * (Kept as Town to avoid breaking existing API/data contracts.)
   */
  name: string;
  latitude: number;
  longitude: number;
};

export type City = {
  /**
   * “Developed municipality” (legacy field name kept as City).
   * (Kept as City to avoid breaking existing DB/API/data contracts.)
   */
  name: string;
  latitude: number;
  longitude: number;
  towns?: Town[];
};

export type GhanaRegion = {
  name: string;
  cities: City[];
};

/**
 * Ghana regions (alphabetically sorted)
 *
 * Hierarchy used by the app:
 * Region -> Developed municipality (stored in the existing `city` field) -> Area (stored in existing `town` field)
 */
export const GHANA_REGIONS: GhanaRegion[] = [
  {
    name: "Ahafo",
    cities: [
      {
        name: "Goaso",
        latitude: 7.633,
        longitude: -2.0,
      },
    ],
  },
  {
    name: "Ashanti",
    cities: [
      {
        name: "Kumasi",
        latitude: 6.7244,
        longitude: -1.5805,
        towns: [
          { name: "Asokwa", latitude: 6.6895, longitude: -1.601 },
          { name: "Tafo", latitude: 6.76, longitude: -1.571 },
        ],
      },
    ],
  },
  {
    name: "Bono",
    cities: [
      {
        name: "Sunyani",
        latitude: 7.336,
        longitude: -2.325,
      },
    ],
  },
  {
    name: "Bono East",
    cities: [
      {
        name: "Techiman",
        latitude: 7.524,
        longitude: -2.078,
      },
    ],
  },
  {
    name: "Central",
    cities: [
      {
        name: "Cape Coast",
        latitude: 5.1093,
        longitude: -1.2465,
        towns: [
          { name: "Elmina", latitude: 5.0847, longitude: -1.3488 },
        ],
      },
    ],
  },
  {
    name: "Eastern",
    cities: [
      {
        name: "Koforidua",
        latitude: 6.087,
        longitude: -0.2636,
      },
    ],
  },
  {
    name: "Greater Accra",
    cities: [
      {
        name: "Accra",
        latitude: 5.6037,
        longitude: -0.187,
        towns: [
          { name: "Madina", latitude: 5.717, longitude: -0.0865 },
          { name: "Tema", latitude: 5.6698, longitude: 0.0166 },
          { name: "Osu", latitude: 5.5578, longitude: -0.1957 },
        ],
      },
    ],
  },
  {
    name: "North East",
    cities: [
      {
        name: "Nalerigu",
        latitude: 10.498,
        longitude: -0.989,
      },
    ],
  },
  {
    name: "Northern",
    cities: [
      {
        name: "Tamale",
        latitude: 9.407,
        longitude: -0.839,
      },
    ],
  },
  {
    name: "Oti",
    cities: [
      {
        name: "Dambai",
        latitude: 7.007,
        longitude: 0.842,
      },
    ],
  },
  {
    name: "Savannah",
    cities: [
      {
        name: "Damongo",
        latitude: 9.99,
        longitude: -1.001,
      },
    ],
  },
  {
    name: "Upper East",
    cities: [
      {
        name: "Bolgatanga",
        latitude: 10.7799,
        longitude: -0.8479,
      },
    ],
  },
  {
    name: "Upper West",
    cities: [
      {
        name: "Wa",
        latitude: 10.0583,
        longitude: -2.4953,
      },
    ],
  },
  {
    name: "Volta",
    cities: [
      {
        name: "Ho",
        latitude: 6.6045,
        longitude: 0.463,
      },
    ],
  },
  {
    name: "Western",
    cities: [
      {
        name: "Sekondi-Takoradi",
        latitude: 4.9036,
        longitude: -1.7568,
        towns: [
          { name: "Sekondi", latitude: 4.9435, longitude: -1.7338 },
          { name: "Takoradi", latitude: 4.8986, longitude: -1.7542 },
        ],
      },
      {
        /**
         * Example requested: “Tarkwa in it (Bogoso)”.
         * Tarkwa => developed municipality, Bogoso => area under it.
         */
        name: "Tarkwa",
        latitude: 4.8833,
        longitude: -1.7667,
        towns: [
          { name: "Bogoso", latitude: 5.1833, longitude: -1.9333 },
        ],
      },
    ],
  },
  {
    name: "Western North",
    cities: [
      {
        name: "Sefwi Wiawso",
        latitude: 6.488,
        longitude: -2.723,
      },
    ],
  },
];