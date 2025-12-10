export interface HistoryEvent {
    year: number;
    month?: number; // 0-11
    title: string;
    description: string;
    type: 'success' | 'failure' | 'discovery' | 'future';
    country?: string; // USA, USSR, etc.
    unlockedParts?: string[]; // Names of parts unlocked
    flavorText?: string; // "Invention of..."
    relatedMissionIds?: string[]; // IDs of missions related to this event
}

export const SpaceHistory: HistoryEvent[] = [
    // --- 1957: The Beginning ---
    {
        year: 1957,
        month: 9,
        title: "historyEvents.sputnik1.title",
        description: "historyEvents.sputnik1.desc",
        type: "success",
        country: "USSR",
        unlockedParts: ["LV-T30 Engine", "X200 Fuel Tank"],
        flavorText: "historyEvents.sputnik1.flavor",
        relatedMissionIds: ["sputnik1"]
    },
    {
        year: 1957,
        month: 10,
        title: "historyEvents.sputnik2.title",
        description: "historyEvents.sputnik2.desc",
        type: "success",
        country: "USSR",
        unlockedParts: ["Mk1 Command Pod"],
        flavorText: "historyEvents.sputnik2.flavor",
        relatedMissionIds: ["sputnik2"]
    },

    // --- 1958: USA Joins ---
    {
        year: 1958,
        month: 0,
        title: "historyEvents.explorer1.title",
        description: "historyEvents.explorer1.desc",
        type: "success",
        country: "USA",
        // unlockedParts: ["Scientific Instruments"], 
        flavorText: "historyEvents.explorer1.flavor"
    },
    {
        year: 1958,
        month: 9,
        title: "historyEvents.nasaFormed.title",
        description: "historyEvents.nasaFormed.desc",
        type: "discovery",
        country: "USA"
    },

    // --- 1959-1960: Reaching for the Moon ---
    {
        year: 1959,
        month: 8,
        title: "historyEvents.luna2.title",
        description: "historyEvents.luna2.desc",
        type: "success",
        country: "USSR",
        flavorText: "historyEvents.luna2.flavor"
    },
    {
        year: 1959,
        month: 9,
        title: "historyEvents.luna3.title",
        description: "historyEvents.luna3.desc",
        type: "discovery",
        country: "USSR"
    },

    // --- 1961: Humans in Space ---
    {
        year: 1961,
        month: 3,
        title: "historyEvents.vostok1.title",
        description: "historyEvents.vostok1.desc",
        type: "success",
        country: "USSR",
        unlockedParts: ["Circular Intake", "Basic Fin"],
        flavorText: "historyEvents.vostok1.flavor"
    },
    {
        year: 1961,
        month: 4,
        title: "historyEvents.freedom7.title",
        description: "historyEvents.freedom7.desc",
        type: "success",
        country: "USA",
        unlockedParts: ["Solid Fuel Booster"],
        flavorText: "historyEvents.freedom7.flavor"
    },

    // --- 1962-1964: Orbital Mastery ---
    {
        year: 1962,
        month: 1,
        title: "historyEvents.friendship7.title",
        description: "historyEvents.friendship7.desc",
        type: "success",
        country: "USA",
        unlockedParts: ["Heat Shield (1.25m)"],
        flavorText: "historyEvents.friendship7.flavor"
    },
    {
        year: 1963,
        month: 5,
        title: "historyEvents.vostok6.title",
        description: "historyEvents.vostok6.desc",
        type: "success",
        country: "USSR"
    },

    // --- 1965-1966: EVAs and Docking ---
    {
        year: 1965,
        month: 2,
        title: "historyEvents.voskhod2.title",
        description: "historyEvents.voskhod2.desc",
        type: "success",
        country: "USSR",
        unlockedParts: ["RCS Thruster Block"],
        flavorText: "historyEvents.voskhod2.flavor"
    },
    {
        year: 1965,
        month: 5,
        title: "historyEvents.gemini4.title",
        description: "historyEvents.gemini4.desc",
        type: "success",
        country: "USA"
    },
    {
        year: 1966,
        month: 2,
        title: "historyEvents.gemini8.title",
        description: "historyEvents.gemini8.desc",
        type: "success",
        country: "USA",
        unlockedParts: ["Docking Port (Small)", "Stack Decoupler"],
        flavorText: "historyEvents.gemini8.flavor"
    },

    // --- 1967-1969: The Moon Race Finals ---
    {
        year: 1967,
        month: 10,
        title: "historyEvents.saturnv.title",
        description: "historyEvents.saturnv.desc",
        type: "success",
        country: "USA",
        unlockedParts: ["Mainsail Engine", "Rockomax Jumbo-64 Tank"],
        flavorText: "historyEvents.saturnv.flavor"
    },
    {
        year: 1967,
        month: 0,
        title: "historyEvents.apollo1.title",
        description: "historyEvents.apollo1.desc",
        type: "failure",
        country: "USA",
        flavorText: "historyEvents.apollo1.flavor"
    },
    {
        year: 1968,
        month: 11,
        title: "historyEvents.apollo8.title",
        description: "historyEvents.apollo8.desc",
        type: "success",
        country: "USA",
        unlockedParts: ["Apollo Capsule"],
        flavorText: "historyEvents.apollo8.flavor"
    },
    {
        year: 1969,
        month: 6,
        title: "historyEvents.apollo11.title",
        description: "historyEvents.apollo11.desc",
        type: "success",
        country: "USA",
        unlockedParts: ["Landing Struts", "Lunar Module Legs"],
        flavorText: "historyEvents.apollo11.flavor"
    },

    // --- 1970s: Stations & Probes ---
    {
        year: 1971,
        month: 3,
        title: "historyEvents.salyut1.title",
        description: "historyEvents.salyut1.desc",
        type: "success",
        country: "USSR",
        unlockedParts: ["Science Lab", "Hitchhiker Container"],
        flavorText: "historyEvents.salyut1.flavor"
    },
    {
        year: 1976,
        month: 6,
        title: "historyEvents.viking1.title",
        description: "historyEvents.viking1.desc",
        type: "success",
        country: "USA",
        flavorText: "historyEvents.viking1.flavor"
    },
    {
        year: 1977,
        month: 8,
        title: "historyEvents.voyager1.title",
        description: "historyEvents.voyager1.desc",
        type: "success",
        country: "USA",
        unlockedParts: ["RTG Generator"],
        flavorText: "historyEvents.voyager1.flavor"
    },

    // --- 1980s-1990s: Shuttle Era ---
    {
        year: 1981,
        month: 3,
        title: "historyEvents.sts1.title",
        description: "historyEvents.sts1.desc",
        type: "success",
        country: "USA",
        unlockedParts: ["Mk3 Cockpit", "Cargo Bay"],
        flavorText: "historyEvents.sts1.flavor"
    },
    {
        year: 1986,
        month: 0,
        title: "historyEvents.challenger.title",
        description: "historyEvents.challenger.desc",
        type: "failure",
        country: "USA"
    },
    {
        year: 1990,
        month: 3,
        title: "historyEvents.hubble.title",
        description: "historyEvents.hubble.desc",
        type: "discovery",
        country: "USA",
        unlockedParts: ["Telescope Array"],
        flavorText: "historyEvents.hubble.flavor"
    },
    {
        year: 1998,
        month: 10,
        title: "historyEvents.issZarya.title",
        description: "historyEvents.issZarya.desc",
        type: "success",
        country: "International",
        unlockedParts: ["Station Hub", "Solar Array (Large)"],
        flavorText: "historyEvents.issZarya.flavor"
    },

    // --- 2000s-Present: Commercial Space ---
    {
        year: 2004,
        month: 9,
        title: "historyEvents.spaceshipone.title",
        description: "historyEvents.spaceshipone.desc",
        type: "success",
        country: "USA (Private)",
        flavorText: "historyEvents.spaceshipone.flavor"
    },
    {
        year: 2012,
        month: 7,
        title: "historyEvents.curiosity.title",
        description: "historyEvents.curiosity.desc",
        type: "success",
        country: "USA"
    },
    {
        year: 2015,
        month: 11,
        title: "historyEvents.falcon9.title",
        description: "historyEvents.falcon9.desc",
        type: "success",
        country: "USA (SpaceX)",
        unlockedParts: ["Landing Legs (Heavy)", "Grid Fins"],
        flavorText: "historyEvents.falcon9.flavor"
    },
    {
        year: 2020,
        month: 4,
        title: "historyEvents.crewDragon.title",
        description: "historyEvents.crewDragon.desc",
        type: "success",
        country: "USA (SpaceX)",
        unlockedParts: ["Crew Dragon Pod"],
        flavorText: "historyEvents.crewDragon.flavor"
    },
    {
        year: 2021,
        month: 11,
        title: "historyEvents.jamesWebb.title",
        description: "historyEvents.jamesWebb.desc",
        type: "discovery",
        country: "USA/ESA/CSA",
        flavorText: "historyEvents.jamesWebb.flavor"
    },

    // --- The Future ---
    {
        year: 2026,
        month: 0,
        title: "historyEvents.artemis3.title",
        description: "historyEvents.artemis3.desc",
        type: "future",
        country: "International",
        unlockedParts: ["Lunar Gateway Module"],
        flavorText: "historyEvents.artemis3.flavor"
    },
    {
        year: 2030,
        month: 0,
        title: "historyEvents.marsSample.title",
        description: "historyEvents.marsSample.desc",
        type: "future",
        country: "USA/ESA"
    },
    {
        year: 2035,
        month: 0,
        title: "historyEvents.marsHumans.title",
        description: "historyEvents.marsHumans.desc",
        type: "future",
        country: "International",
        unlockedParts: ["Mars Habitat", "ISRU Converter"],
        flavorText: "historyEvents.marsHumans.flavor"
    },
    {
        year: 2050,
        month: 0,
        title: "historyEvents.marsCity.title",
        description: "historyEvents.marsCity.desc",
        type: "future",
        country: "International",
        unlockedParts: ["Nuclear Reactor"],
        flavorText: "historyEvents.marsCity.flavor"
    },
    {
        year: 2075,
        month: 0,
        title: "historyEvents.titanColony.title",
        description: "historyEvents.titanColony.desc",
        type: "future",
        country: "International",
        flavorText: "historyEvents.titanColony.flavor"
    },
    {
        year: 2100,
        month: 0,
        title: "historyEvents.proxima.title",
        description: "historyEvents.proxima.desc",
        type: "future",
        country: "International",
        unlockedParts: ["Antimatter Engine"],
        flavorText: "historyEvents.proxima.flavor"
    }
];
