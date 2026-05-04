/**
 * Event Planning Suggestion & Anchoring Engine
 * Analyzes canvas items and event settings to suggest equipment and auto-add anchoring
 */

/**
 * Analyze canvas state and generate suggestions
 * @param {Array} canvasItems - Items on the canvas
 * @param {Object} eventData - Event metadata (guestCount, surface, isIndoor, eventDate, eventTime, etc.)
 * @param {Array} equipment - Full equipment catalog
 * @returns {Array} suggestions - Array of {type, reason, equipmentId, equipmentName, quantity, autoAdd}
 */
export function generateSuggestions(canvasItems, eventData, equipment) {
  const suggestions = [];
  const itemCategories = canvasItems.map(item => item.category);
  const hasGenerator = itemCategories.includes('Generator') || canvasItems.some(i => i.equipmentName?.toLowerCase().includes('generator'));
  const hasTent = itemCategories.includes('Tent') || canvasItems.some(i => i.equipmentName?.toLowerCase().includes('tent'));
  const hasHeaters = itemCategories.includes('Heater') || canvasItems.some(i => i.equipmentName?.toLowerCase().includes('heater'));
  const hasCoolers = itemCategories.includes('Cooler') || canvasItems.some(i => i.equipmentName?.toLowerCase().includes('cooler'));
  const hasInflatable = itemCategories.includes('Inflatable') || canvasItems.some(i => i.equipmentName?.toLowerCase().includes('inflatable'));
  const hasBar = canvasItems.some(i => i.label?.toLowerCase().includes('bar'));
  const hasLighting = itemCategories.includes('Light') || canvasItems.some(i => i.equipmentName?.toLowerCase().includes('light'));
  const itemCount = canvasItems.length;
  const guestCount = eventData?.guestCount || 0;
  const isOutdoor = !eventData?.isIndoor;
  const isSummer = new Date(eventData?.eventDate).getMonth() >= 5 && new Date(eventData?.eventDate).getMonth() <= 8;
  const isWinter = new Date(eventData?.eventDate).getMonth() <= 2 || new Date(eventData?.eventDate).getMonth() >= 11;
  const eventTime = eventData?.eventTime || '12:00';
  const isPastSunset = parseInt(eventTime.split(':')[0]) >= 18 || parseInt(eventTime.split(':')[0]) <= 6;
  const surface = eventData?.venueSurface || 'unknown';

  // 1. No power source + outdoor + powered equipment
  const hasPoweredEquipment = canvasItems.some(i => {
    const name = (i.equipmentName || '').toLowerCase();
    return name.includes('inflatable') || name.includes('light') || name.includes('cooler') || name.includes('heater');
  });

  if (isOutdoor && hasPoweredEquipment && !hasGenerator) {
    const generatorEq = equipment.find(e => e.category === 'Generator' || e.name?.toLowerCase().includes('portable generator'));
    if (generatorEq) {
      suggestions.push({
        type: 'power',
        reason: 'Outdoor powered equipment requires power source',
        equipmentId: generatorEq.id,
        equipmentName: generatorEq.name,
        quantity: 1,
        autoAdd: false,
        category: 'power',
      });
    }
  }

  // 2. Summer + outdoor + no cooling
  if (isSummer && isOutdoor && guestCount >= 50 && !hasCoolers) {
    const coolerEq = equipment.find(e => (e.category === 'Cooler' || e.name?.toLowerCase().includes('evaporative')) && !e.name?.toLowerCase().includes('ice'));
    if (coolerEq) {
      suggestions.push({
        type: 'comfort',
        reason: 'Summer outdoor event with 50+ guests — cooling recommended',
        equipmentId: coolerEq.id,
        equipmentName: coolerEq.name,
        quantity: Math.ceil(guestCount / 100),
        autoAdd: false,
        category: 'comfort',
      });
    }
  }

  // 3. Winter + outdoor + no heating
  if (isWinter && isOutdoor && guestCount >= 30 && !hasHeaters) {
    const heaterEq = equipment.find(e => e.name?.toLowerCase().includes('heater') && e.name?.toLowerCase().includes('patio'));
    if (heaterEq) {
      suggestions.push({
        type: 'comfort',
        reason: 'Winter outdoor event with 30+ guests — heating recommended',
        equipmentId: heaterEq.id,
        equipmentName: heaterEq.name,
        quantity: Math.ceil(guestCount / 50),
        autoAdd: false,
        category: 'comfort',
      });
    }
  }

  // 4. Event past sunset + outdoor + no lighting
  if (isPastSunset && isOutdoor && !hasLighting) {
    const lightingEq = equipment.find(e => e.name?.toLowerCase().includes('light') && e.name?.toLowerCase().includes('string'));
    if (lightingEq) {
      suggestions.push({
        type: 'lighting',
        reason: 'Event runs past sunset — lighting required',
        equipmentId: lightingEq.id,
        equipmentName: lightingEq.name,
        quantity: 1,
        autoAdd: false,
        category: 'lighting',
      });
    }
  }

  // 5. Inflatable + no generator
  if (hasInflatable && !hasGenerator) {
    const generatorEq = equipment.find(e => e.category === 'Generator' || e.name?.toLowerCase().includes('portable generator'));
    if (generatorEq) {
      suggestions.push({
        type: 'power',
        reason: 'Inflatable requires power',
        equipmentId: generatorEq.id,
        equipmentName: generatorEq.name,
        quantity: 1,
        autoAdd: true,
        category: 'power',
      });
    }
  }

  // 6. Large event (500+ guests) + public venue + no barriers
  const hasBarriers = itemCategories.includes('Barrier') || canvasItems.some(i => i.equipmentName?.toLowerCase().includes('barrier'));
  if (guestCount >= 500 && !hasBarriers) {
    const barrierEq = equipment.find(e => e.name?.toLowerCase().includes('barrier') || e.name?.toLowerCase().includes('stanchion'));
    if (barrierEq) {
      suggestions.push({
        type: 'safety',
        reason: 'Large public event requires crowd barriers',
        equipmentId: barrierEq.id,
        equipmentName: barrierEq.name,
        quantity: Math.ceil(guestCount / 50),
        autoAdd: false,
        category: 'safety',
      });
    }
  }

  // 7. Bar zone on canvas + no bar setup
  if (hasBar && !itemCategories.includes('Bar Table')) {
    const barTableEq = equipment.find(e => e.name?.toLowerCase().includes('bar') && e.name?.toLowerCase().includes('table'));
    if (barTableEq) {
      suggestions.push({
        type: 'bar',
        reason: 'Bar zone defined — bar tables, stools, ice chests recommended',
        equipmentId: barTableEq.id,
        equipmentName: barTableEq.name,
        quantity: 1,
        autoAdd: false,
        category: 'bar',
      });
    }
  }

  return suggestions;
}

/**
 * Analyze surface type and generate anchoring requirements
 * Returns items to auto-add and warnings
 */
export function getAnchoringRequirements(surface, hasTent) {
  if (!hasTent) return { autoAdd: [], warnings: [] };

  const requirements = {
    grass: {
      autoAdd: [{ name: 'Rebar Stakes', quantity: 12, reason: 'Stake & rebar for grass/soft soil' }],
      warnings: [],
      method: 'Stake & rebar',
    },
    'hard clay': {
      autoAdd: [{ name: 'Extended Rebar', quantity: 16, reason: 'Long rebar + water for hard clay' }],
      warnings: [],
      method: 'Long rebar + water',
    },
    asphalt: {
      autoAdd: [{ name: 'Water Barrels', quantity: 8, reason: 'Water barrel ballast for asphalt' }],
      warnings: ['Drilling service available but may require permit'],
      method: 'Water barrel ballast',
    },
    concrete: {
      autoAdd: [{ name: 'Water Barrels', quantity: 10, reason: 'Water barrel ballast for concrete' }],
      warnings: ['Core drilling available but requires permit'],
      method: 'Water barrel ballast',
    },
    pavers: {
      autoAdd: [
        { name: 'Water Barrels', quantity: 8, reason: 'Water barrel ballast' },
        { name: 'Rubber Mats', quantity: 4, reason: 'Protective mats for pavers' },
      ],
      warnings: ['Protect decorative pavers with mats'],
      method: 'Ballast + rubber mats',
    },
    sand: {
      autoAdd: [{ name: 'Screw Anchors', quantity: 12, reason: 'Screw anchors + guy wires for sand' }],
      warnings: [],
      method: 'Screw anchors + guy wires',
    },
    unknown: {
      autoAdd: [],
      warnings: ['Surface type unknown — confirm before delivery to determine anchoring method'],
      method: 'Pending surface confirmation',
    },
  };

  return requirements[surface] || requirements.unknown;
}

/**
 * Filter out duplicate suggestions (by equipmentId)
 */
export function deduplicateSuggestions(suggestions) {
  const seen = new Set();
  return suggestions.filter(s => {
    if (seen.has(s.equipmentId)) return false;
    seen.add(s.equipmentId);
    return true;
  });
}