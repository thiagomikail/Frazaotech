/**
 * Energy Management System - Mock Data Generator
 * Based on generic industrial furnace metrics inspired by US DOE Process Heating assessments.
 * 
 * Assets:
 * - 3 Sidewell Furnaces (Aluminium melting/holding)
 * - 1 Kiln Rotary Furnace (Calcination/processing)
 */

// Initial Plant Assets
export const ASSETS = [
    { id: 'f1', name: 'Furnace 1', type: 'sidewell', status: 'running' },
    { id: 'f2', name: 'Furnace 2', type: 'sidewell', status: 'warning' },
    { id: 'f3', name: 'Furnace 3', type: 'sidewell', status: 'maintenance' },
    { id: 'k1', name: 'Rotary Kiln 1', type: 'kiln', status: 'running' }
];

const LOSS_CATEGORIES = {
    ASSET_CONDITION: 'Asset Conditions',
    OPERATING_PRACTICE: 'Operating Practices',
    SCHEDULING: 'Scheduling'
};

const RECOMMENDATION_TYPES = {
    FIX: 'Maintenance Fix',
    PROCESS: 'Process Change',
    SCHEDULE: 'Scheduling Adjustment',
    SUPPLY_CHAIN: 'Supply Chain Opt.'
};

// Base consumption values (MMBtu/hr)
const BASE_LOAD = {
    sidewell: 12.5,
    kiln: 45.0
};

/**
 * Generates a snapshot of the plant status.
 */
export function generatePlantData() {
    const assets = ASSETS.map(asset => {
        const base = BASE_LOAD[asset.type];
        // Add random fluctuation +/- 5%
        const currentLoad = base * (0.95 + Math.random() * 0.1);

        // Calculate efficiency based on status
        let efficiency = 0.45; // 45% standard efficiency
        if (asset.status === 'warning') efficiency = 0.35;
        if (asset.status === 'maintenance') efficiency = 0.10; // Idling

        const usefulEnergy = currentLoad * efficiency;
        const totalLoss = currentLoad - usefulEnergy;

        // Distribute losses
        const losses = [
            {
                id: `l-${asset.id}-1`,
                category: LOSS_CATEGORIES.ASSET_CONDITION,
                name: 'Wall Transmission Loss',
                value: totalLoss * 0.3, // 30% of losses
                unit: 'MMBtu/hr',
                impact: 'high'
            },
            {
                id: `l-${asset.id}-2`,
                category: LOSS_CATEGORIES.OPERATING_PRACTICE,
                name: 'Flue Gas Loss (Excess Air)',
                value: totalLoss * 0.5, // 50% of losses
                unit: 'MMBtu/hr',
                impact: 'critical'
            },
            {
                id: `l-${asset.id}-3`,
                category: LOSS_CATEGORIES.SCHEDULING,
                name: 'Idling/Opening Losses',
                value: totalLoss * 0.2, // 20% of losses
                unit: 'MMBtu/hr',
                impact: 'medium'
            }
        ];

        // Generate context-aware recommendations
        const recommendations = [];
        if (asset.status === 'warning') {
            recommendations.push({
                id: `r-${asset.id}-1`,
                type: RECOMMENDATION_TYPES.FIX,
                description: `Fix burner "A" on ${asset.name} (Air/Fuel Ratio)`,
                potentialSaving: '2.4 MMBtu/hr',
                priority: 'Urgent'
            });
        }
        if (asset.type === 'sidewell') {
            recommendations.push({
                id: `r-${asset.id}-2`,
                type: RECOMMENDATION_TYPES.PROCESS,
                description: `Reduce salt consumption on shift B for ${asset.name}`,
                potentialSaving: '0.5 MMBtu/hr',
                priority: 'Normal'
            });
        }

        // Supply Chain Logic (Simulated)
        // Recommendations that involve other assets
        if (asset.id === 'f1') {
            recommendations.push({
                id: `r-${asset.id}-3`,
                type: RECOMMENDATION_TYPES.SUPPLY_CHAIN,
                description: `Increase charge rate to 70% on Sidewell A and Idle Sidewell B to optimize thermal mass.`,
                potentialSaving: '5.2 MMBtu/hr',
                priority: 'High',
                actions: [
                    { asset: 'Sidewell A', action: 'Increase Charge', value: '70% Load' },
                    { asset: 'Sidewell B', action: 'Set State', value: 'Idle' }
                ]
            });
        }

        return {
            ...asset,
            energy: {
                currentLoad: currentLoad.toFixed(2),
                usefulEnergy: usefulEnergy.toFixed(2),
                totalLoss: totalLoss.toFixed(2),
                unit: 'MMBtu/hr'
            },
            losses,
            recommendations
        };
    });

    return assets;
}

// Initial State for Trees/Sankey
export const INITIAL_DATA = generatePlantData();
