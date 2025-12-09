export interface HistoryEvent {
    year: number;
    month?: number; // 0-11
    title: string;
    description: string;
    type: 'success' | 'failure' | 'discovery' | 'future';
    country?: string; // USA, USSR, etc.
    unlockedParts?: string[]; // Names of parts unlocked
    flavorText?: string; // "Invention of..."
}

export const SpaceHistory: HistoryEvent[] = [
    // --- 1957: The Beginning ---
    {
        year: 1957,
        month: 9,
        title: "Sputnik 1",
        description: "The Soviet Union launches the first artificial satellite, marking the start of the Space Age.",
        type: "success",
        country: "USSR",
        unlockedParts: ["LV-T30 Engine", "X200 Fuel Tank"],
        flavorText: "Basic Rocketry & Liquid Fuel Engines"
    },
    {
        year: 1957,
        month: 10,
        title: "Sputnik 2",
        description: "First animal in orbit (Laika). Proved living passengers could survive launch.",
        type: "success",
        country: "USSR",
        unlockedParts: ["Mk1 Command Pod"],
        flavorText: "Life Support Systems"
    },

    // --- 1958: USA Joins ---
    {
        year: 1958,
        month: 0,
        title: "Explorer 1",
        description: "First US satellite. Discovered the Van Allen radiation belts.",
        type: "success",
        country: "USA",
        // unlockedParts: ["Scientific Instruments"], 
        flavorText: "Radiation Hardening"
    },
    {
        year: 1958,
        month: 9,
        title: "NASA Formed",
        description: "The National Aeronautics and Space Administration is established.",
        type: "discovery",
        country: "USA"
    },

    // --- 1959-1960: Reaching for the Moon ---
    {
        year: 1959,
        month: 8,
        title: "Luna 2",
        description: "First human-made object to impact the Moon.",
        type: "success",
        country: "USSR",
        flavorText: "Guidance Systems V1"
    },
    {
        year: 1959,
        month: 9,
        title: "Luna 3",
        description: "First photographs of the far side of the Moon.",
        type: "discovery",
        country: "USSR"
    },

    // --- 1961: Humans in Space ---
    {
        year: 1961,
        month: 3,
        title: "Vostok 1",
        description: "Yuri Gagarin becomes the first human in space (Orbit).",
        type: "success",
        country: "USSR",
        unlockedParts: ["Circular Intake", "Basic Fin"],
        flavorText: "Manned Orbital Flight"
    },
    {
        year: 1961,
        month: 4,
        title: "Freedom 7",
        description: "Alan Shepard becomes the first American in space (Suborbital).",
        type: "success",
        country: "USA",
        unlockedParts: ["Solid Fuel Booster"],
        flavorText: "Solid Rocket Motors"
    },

    // --- 1962-1964: Orbital Mastery ---
    {
        year: 1962,
        month: 1,
        title: "Friendship 7",
        description: "John Glenn orbits Earth. First US orbital flight.",
        type: "success",
        country: "USA",
        unlockedParts: ["Heat Shield (1.25m)"],
        flavorText: "Re-entry Thermal Protection"
    },
    {
        year: 1963,
        month: 5,
        title: "Vostok 6",
        description: "Valentina Tereshkova becomes the first woman in space.",
        type: "success",
        country: "USSR"
    },

    // --- 1965-1966: EVAs and Docking ---
    {
        year: 1965,
        month: 2,
        title: "Voskhod 2",
        description: "Alexei Leonov performs the first Spacewalk (EVA).",
        type: "success",
        country: "USSR",
        unlockedParts: ["RCS Thruster Block"],
        flavorText: "Extravehicular Mobility Units"
    },
    {
        year: 1965,
        month: 5,
        title: "Gemini 4",
        description: "First US Spacewalk by Ed White.",
        type: "success",
        country: "USA"
    },
    {
        year: 1966,
        month: 2,
        title: "Gemini 8",
        description: "First docking of two spacecraft in orbit.",
        type: "success",
        country: "USA",
        unlockedParts: ["Docking Port (Small)", "Stack Decoupler"],
        flavorText: "Orbital Rendezvous & Docking"
    },

    // --- 1967-1969: The Moon Race Finals ---
    {
        year: 1967,
        month: 10,
        title: "Saturn V",
        description: "First all-up launch of the massive Saturn V rocket (Apollo 4).",
        type: "success",
        country: "USA",
        unlockedParts: ["Mainsail Engine", "Rockomax Jumbo-64 Tank"],
        flavorText: "Heavy Lift rocketry"
    },
    {
        year: 1967,
        month: 0,
        title: "Apollo 1 Fire",
        description: "Tragedy strikes the Apollo program. Three astronauts lost.",
        type: "failure",
        country: "USA",
        flavorText: "Safety Protocols Overhaul"
    },
    {
        year: 1968,
        month: 11,
        title: "Apollo 8",
        description: "First crewed spacecraft to orbit the Moon.",
        type: "success",
        country: "USA",
        unlockedParts: ["Apollo Capsule"],
        flavorText: "Lunar Trajectory Navigation"
    },
    {
        year: 1969,
        month: 6,
        title: "Apollo 11",
        description: "Humans walk on the Moon. 'One giant leap for mankind'.",
        type: "success",
        country: "USA",
        unlockedParts: ["Landing Struts", "Lunar Module Legs"],
        flavorText: "Lunar Surface Operations"
    },

    // --- 1970s: Stations & Probes ---
    {
        year: 1971,
        month: 3,
        title: "Salyut 1",
        description: "First space station launched.",
        type: "success",
        country: "USSR",
        unlockedParts: ["Science Lab", "Hitchhiker Container"],
        flavorText: "Long-duration Habitation"
    },
    {
        year: 1976,
        month: 6,
        title: "Viking 1",
        description: "First successful landing on Mars.",
        type: "success",
        country: "USA",
        flavorText: "Interplanetary Communications"
    },
    {
        year: 1977,
        month: 8,
        title: "Voyager 1",
        description: "Launch of the probe that would leave the solar system.",
        type: "success",
        country: "USA",
        unlockedParts: ["RTG Generator"],
        flavorText: "Deep Space Power Systems"
    },

    // --- 1980s-1990s: Shuttle Era ---
    {
        year: 1981,
        month: 3,
        title: "STS-1 Columbia",
        description: "First flight of the reusable Space Shuttle.",
        type: "success",
        country: "USA",
        unlockedParts: ["Mk3 Cockpit", "Cargo Bay"],
        flavorText: "Reusable Spacecraft"
    },
    {
        year: 1986,
        month: 0,
        title: "Challenger",
        description: "Shuttle Challenger disaster during launch.",
        type: "failure",
        country: "USA"
    },
    {
        year: 1990,
        month: 3,
        title: "Hubble",
        description: "Deployment of the Hubble Space Telescope.",
        type: "discovery",
        country: "USA",
        unlockedParts: ["Telescope Array"],
        flavorText: "Advanced Optics"
    },
    {
        year: 1998,
        month: 10,
        title: "ISS Zarya",
        description: "First module of the International Space Station.",
        type: "success",
        country: "International",
        unlockedParts: ["Station Hub", "Solar Array (Large)"],
        flavorText: "Modular Station Construction"
    },

    // --- 2000s-Present: Commercial Space ---
    {
        year: 2004,
        month: 9,
        title: "SpaceShipOne",
        description: "First privately funded human spaceflight.",
        type: "success",
        country: "USA (Private)",
        flavorText: "Commercial Spaceflight"
    },
    {
        year: 2012,
        month: 7,
        title: "Curiosity Rover",
        description: "Landing of the massive rover on Mars via Skycrane.",
        type: "success",
        country: "USA"
    },
    {
        year: 2015,
        month: 11,
        title: "Falcon 9 Landing",
        description: "SpaceX lands an orbital booster for the first time.",
        type: "success",
        country: "USA (SpaceX)",
        unlockedParts: ["Landing Legs (Heavy)", "Grid Fins"],
        flavorText: "Propulsive Landing"
    },
    {
        year: 2020,
        month: 4,
        title: "Crew Dragon",
        description: "First commercial crew launch to ISS.",
        type: "success",
        country: "USA (SpaceX)",
        unlockedParts: ["Crew Dragon Pod"],
        flavorText: "Touchscreen Cockpits"
    },
    {
        year: 2021,
        month: 11,
        title: "James Webb",
        description: "Launch of the most advanced space telescope.",
        type: "discovery",
        country: "USA/ESA/CSA",
        flavorText: "Infrared Astronomy"
    },

    // --- The Future ---
    {
        year: 2026,
        month: 0,
        title: "Artemis III",
        description: "Return of humans to the Lunar surface.",
        type: "future",
        country: "International",
        unlockedParts: ["Lunar Gateway Module"],
        flavorText: "Deep Space Logistics"
    },
    {
        year: 2030,
        month: 0,
        title: "Mars Sample Return",
        description: "Robotic return of soil samples from Mars.",
        type: "future",
        country: "USA/ESA"
    },
    {
        year: 2035,
        month: 0,
        title: "First Humans on Mars",
        description: "Human footprint on the Red Planet.",
        type: "future",
        country: "International",
        unlockedParts: ["Mars Habitat", "ISRU Converter"],
        flavorText: "In-Situ Resource Utilization"
    },
    {
        year: 2050,
        month: 0,
        title: "Mars City Alpha",
        description: "First permanent settlement reaches 1,000 residents.",
        type: "future",
        country: "International",
        unlockedParts: ["Nuclear Reactor"],
        flavorText: "Self-sustaining Ecosystems"
    },
    {
        year: 2075,
        month: 0,
        title: "Titan Colony",
        description: "Outpost established on Saturn's moon Titan.",
        type: "future",
        country: "International",
        flavorText: "Cryo-Engineering"
    },
    {
        year: 2100,
        month: 0,
        title: "Proxima Centauri",
        description: "Launch of the first relativistic lightsail probe.",
        type: "future",
        country: "International",
        unlockedParts: ["Antimatter Engine"],
        flavorText: "Interstellar Propulsion"
    }
];
