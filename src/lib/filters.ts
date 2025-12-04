export interface Filter {
    name: string;
    class: string;
    filter: {
      contrast?: number;
      brightness?: number;
      saturate?: number;
      sepia?: number;
      grayscale?: number;
      hueRotate?: number;
      blur?: number;
    };
  }
  
  export const INSTAGRAM_FILTERS: Filter[] = [
    {
      name: "Normal",
      class: "",
      filter: {}
    },
    {
      name: "Clarendon",
      class: "filter-clarendon",
      filter: {
        contrast: 120,
        saturate: 125,
        brightness: 110 // Approximate brightness boost
      }
    },
    {
      name: "Gingham",
      class: "filter-gingham",
      filter: {
        brightness: 105,
        hueRotate: -10, // slight cool shift
        sepia: 0 // Gingham is complex, but we simulate basics
      }
    },
    {
      name: "Moon",
      class: "filter-moon",
      filter: {
        grayscale: 100,
        contrast: 110,
        brightness: 110
      }
    },
    {
      name: "Lark",
      class: "filter-lark",
      filter: {
        contrast: 90,
        brightness: 115,
        saturate: 110
      }
    },
    {
      name: "Reyes",
      class: "filter-reyes",
      filter: {
        sepia: 22,
        brightness: 110,
        contrast: 85
      }
    },
    {
      name: "Juno",
      class: "filter-juno",
      filter: {
        contrast: 120,
        brightness: 110,
        saturate: 140,
        sepia: 20
      }
    },
    {
      name: "Slumber",
      class: "filter-slumber",
      filter: {
        brightness: 105,
        saturate: 66,
        sepia: 40
      }
    },
    {
      name: "Crema",
      class: "filter-crema",
      filter: {
        contrast: 90,
        saturate: 90,
        sepia: 20
      }
    },
    {
      name: "Ludwig",
      class: "filter-ludwig",
      filter: {
        brightness: 105,
        saturate: 100, // Actually pushes reds, hard to do with simple CSS
        contrast: 105
      }
    },
    {
      name: "Aden",
      class: "filter-aden",
      filter: {
        hueRotate: -20,
        contrast: 90,
        brightness: 120,
        saturate: 85
      }
    },
    {
      name: "Perpetua",
      class: "filter-perpetua",
      filter: {
        contrast: 110,
        brightness: 110,
        saturate: 110
      }
    }
  ];
