/**
 * Spec templates per equipment category.
 * Each entry is an ordered list of { key, label, placeholder, unit? }
 * The `specs` object on Equipment stores values as strings.
 */

export const CATEGORY_SPECS = {
  'Generator': [
    { key: 'kw', label: 'Output (kW)', placeholder: 'e.g. 7.5' },
    { key: 'voltage', label: 'Voltage', placeholder: 'e.g. 120/240V' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Gasoline' },
    { key: 'tank_size', label: 'Tank Size', placeholder: 'e.g. 6 gal' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 10W-30' },
    { key: 'oil_capacity', label: 'Oil Capacity', placeholder: 'e.g. 0.6 qt' },
    { key: 'runtime', label: 'Runtime', placeholder: 'e.g. 9 hrs at 50% load' },
  ],
  'Air Compressor': [
    { key: 'cfm', label: 'CFM @ 90 PSI', placeholder: 'e.g. 13' },
    { key: 'max_psi', label: 'Max PSI', placeholder: 'e.g. 175' },
    { key: 'tank_size', label: 'Tank Size', placeholder: 'e.g. 60 gal' },
    { key: 'fuel_type', label: 'Fuel / Power', placeholder: 'e.g. Electric / Diesel' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 30 non-detergent' },
    { key: 'voltage', label: 'Voltage (if electric)', placeholder: 'e.g. 240V' },
  ],
  'Scissor Lift': [
    { key: 'max_height', label: 'Max Platform Height', placeholder: 'e.g. 32 ft' },
    { key: 'capacity', label: 'Weight Capacity', placeholder: 'e.g. 800 lbs' },
    { key: 'platform_size', label: 'Platform Size', placeholder: 'e.g. 96" x 46"' },
    { key: 'fuel_type', label: 'Fuel / Power', placeholder: 'e.g. Electric / Propane' },
    { key: 'drive_type', label: 'Drive Type', placeholder: 'e.g. 2WD / 4WD' },
  ],
  'Boom Lift': [
    { key: 'max_height', label: 'Max Working Height', placeholder: 'e.g. 60 ft' },
    { key: 'horizontal_reach', label: 'Horizontal Reach', placeholder: 'e.g. 50 ft' },
    { key: 'capacity', label: 'Weight Capacity', placeholder: 'e.g. 500 lbs' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'drive_type', label: 'Drive Type', placeholder: 'e.g. 4WD' },
  ],
  'Forklift': [
    { key: 'lift_capacity', label: 'Lift Capacity', placeholder: 'e.g. 5,000 lbs' },
    { key: 'lift_height', label: 'Max Lift Height', placeholder: 'e.g. 15 ft' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Propane / Electric' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. 10W-30' },
    { key: 'tire_type', label: 'Tire Type', placeholder: 'e.g. Cushion / Pneumatic' },
  ],
  'Telehandler': [
    { key: 'lift_capacity', label: 'Lift Capacity', placeholder: 'e.g. 6,000 lbs' },
    { key: 'lift_height', label: 'Max Lift Height', placeholder: 'e.g. 42 ft' },
    { key: 'forward_reach', label: 'Max Forward Reach', placeholder: 'e.g. 28 ft' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. 15W-40' },
  ],
  'Pressure Washer': [
    { key: 'psi', label: 'PSI', placeholder: 'e.g. 3,200' },
    { key: 'gpm', label: 'GPM', placeholder: 'e.g. 2.8' },
    { key: 'fuel_type', label: 'Fuel / Power', placeholder: 'e.g. Gasoline / Electric' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 10W-30' },
    { key: 'nozzle_tips', label: 'Nozzle Tips Included', placeholder: 'e.g. 0°, 15°, 25°, 40°' },
  ],
  'Tent': [
    { key: 'dimensions', label: 'Dimensions', placeholder: 'e.g. 20 x 40 ft' },
    { key: 'capacity', label: 'Capacity', placeholder: 'e.g. 80 guests' },
    { key: 'anchor_type', label: 'Anchor Type', placeholder: 'e.g. Stakes / Water Weights / Concrete Blocks' },
    { key: 'surface_type', label: 'Surface Requirements', placeholder: 'e.g. Grass only / Concrete OK' },
    { key: 'clearance', label: 'Clearance Required', placeholder: 'e.g. 5 ft perimeter' },
    { key: 'sidewalls', label: 'Sidewalls Included', placeholder: 'e.g. Yes / No' },
  ],
  'Trailer': [
    { key: 'gvwr', label: 'GVWR', placeholder: 'e.g. 14,000 lbs' },
    { key: 'payload', label: 'Payload Capacity', placeholder: 'e.g. 10,000 lbs' },
    { key: 'length', label: 'Length', placeholder: 'e.g. 20 ft' },
    { key: 'width', label: 'Width', placeholder: 'e.g. 83"' },
    { key: 'hitch_type', label: 'Hitch Type', placeholder: 'e.g. 2-5/16" ball / Pintle' },
    { key: 'ramp', label: 'Ramp / Loading', placeholder: 'e.g. Fold-down ramp' },
  ],
  'Welder': [
    { key: 'amperage', label: 'Amperage Range', placeholder: 'e.g. 40–225A' },
    { key: 'voltage', label: 'Voltage', placeholder: 'e.g. 120/240V' },
    { key: 'process', label: 'Process', placeholder: 'e.g. Stick / MIG / TIG' },
    { key: 'fuel_type', label: 'Fuel / Power', placeholder: 'e.g. Electric / Gas' },
    { key: 'duty_cycle', label: 'Duty Cycle', placeholder: 'e.g. 20% at 225A' },
  ],
  'Pallet Jack': [
    { key: 'capacity', label: 'Weight Capacity', placeholder: 'e.g. 5,500 lbs' },
    { key: 'fork_length', label: 'Fork Length', placeholder: 'e.g. 48"' },
    { key: 'fork_width', label: 'Fork Width', placeholder: 'e.g. 27"' },
    { key: 'type', label: 'Type', placeholder: 'e.g. Manual / Electric' },
  ],
  'Excavator': [
    { key: 'operating_weight', label: 'Operating Weight', placeholder: 'e.g. 18,000 lbs' },
    { key: 'dig_depth', label: 'Max Dig Depth', placeholder: 'e.g. 14 ft' },
    { key: 'bucket_capacity', label: 'Bucket Capacity', placeholder: 'e.g. 0.5 cu yd' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'oil_type', label: 'Engine Oil', placeholder: 'e.g. 15W-40' },
    { key: 'hydraulic_oil', label: 'Hydraulic Oil', placeholder: 'e.g. ISO 46' },
  ],
  'Skid Steer': [
    { key: 'rated_capacity', label: 'Rated Operating Capacity', placeholder: 'e.g. 2,200 lbs' },
    { key: 'tipping_load', label: 'Tipping Load', placeholder: 'e.g. 4,400 lbs' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'oil_type', label: 'Engine Oil', placeholder: 'e.g. 15W-40' },
    { key: 'attachment', label: 'Attachment Plate', placeholder: 'e.g. Universal Skid Steer' },
  ],
  'Backhoe': [
    { key: 'dig_depth', label: 'Max Dig Depth', placeholder: 'e.g. 14.5 ft' },
    { key: 'loader_capacity', label: 'Loader Capacity', placeholder: 'e.g. 1.0 cu yd' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'oil_type', label: 'Engine Oil', placeholder: 'e.g. 15W-40' },
  ],
  'Bulldozer': [
    { key: 'operating_weight', label: 'Operating Weight', placeholder: 'e.g. 20,000 lbs' },
    { key: 'blade_width', label: 'Blade Width', placeholder: 'e.g. 10 ft' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'oil_type', label: 'Engine Oil', placeholder: 'e.g. 15W-40' },
  ],
  'Compactor': [
    { key: 'type', label: 'Type', placeholder: 'e.g. Plate / Jumping Jack / Roller' },
    { key: 'compaction_force', label: 'Compaction Force', placeholder: 'e.g. 3,000 lbs' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Gasoline' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 10W-30' },
  ],
  'Plate Compactor': [
    { key: 'compaction_force', label: 'Compaction Force', placeholder: 'e.g. 3,500 lbs' },
    { key: 'plate_size', label: 'Plate Size', placeholder: 'e.g. 20" x 23"' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Gasoline' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 10W-30' },
  ],
  'Light Tower': [
    { key: 'light_type', label: 'Light Type', placeholder: 'e.g. LED / Metal Halide' },
    { key: 'lumen_output', label: 'Lumen Output', placeholder: 'e.g. 140,000 lm' },
    { key: 'mast_height', label: 'Mast Height', placeholder: 'e.g. 30 ft' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'tank_size', label: 'Tank Size', placeholder: 'e.g. 50 gal' },
    { key: 'runtime', label: 'Runtime', placeholder: 'e.g. 72 hrs' },
  ],
  'Trencher': [
    { key: 'trench_depth', label: 'Max Trench Depth', placeholder: 'e.g. 48"' },
    { key: 'trench_width', label: 'Trench Width', placeholder: 'e.g. 6"' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Gasoline / Diesel' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 10W-30' },
    { key: 'chain_type', label: 'Chain Type', placeholder: 'e.g. Combination / Rock' },
  ],
  'Water Pump': [
    { key: 'gpm', label: 'Flow Rate (GPM)', placeholder: 'e.g. 250' },
    { key: 'max_head', label: 'Max Head', placeholder: 'e.g. 90 ft' },
    { key: 'inlet_size', label: 'Inlet/Outlet Size', placeholder: 'e.g. 3"' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Gasoline' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 10W-30' },
    { key: 'solids_handling', label: 'Solids Handling', placeholder: 'e.g. Up to 1.25"' },
  ],
  'Sandblaster': [
    { key: 'tank_capacity', label: 'Tank Capacity', placeholder: 'e.g. 300 lbs' },
    { key: 'required_cfm', label: 'Required CFM', placeholder: 'e.g. 150 CFM @ 100 PSI' },
    { key: 'nozzle_size', label: 'Nozzle Size', placeholder: 'e.g. #6' },
    { key: 'media_type', label: 'Media Type', placeholder: 'e.g. Sand / Steel Grit / Soda' },
  ],
  'Floor Sander': [
    { key: 'drum_width', label: 'Drum/Disc Width', placeholder: 'e.g. 8"' },
    { key: 'voltage', label: 'Voltage', placeholder: 'e.g. 120V / 240V' },
    { key: 'grit_sizes', label: 'Grit Sizes Available', placeholder: 'e.g. 36, 60, 80, 100' },
    { key: 'dust_collection', label: 'Dust Collection', placeholder: 'e.g. Built-in bag' },
  ],
  'Tile Stripper': [
    { key: 'blade_width', label: 'Blade Width', placeholder: 'e.g. 8"' },
    { key: 'voltage', label: 'Voltage', placeholder: 'e.g. 120V' },
    { key: 'blade_type', label: 'Blade Type', placeholder: 'e.g. Chisel / Scraper' },
  ],
  'Stump Grinder': [
    { key: 'cutting_depth', label: 'Cutting Depth', placeholder: 'e.g. 12" below grade' },
    { key: 'cutting_width', label: 'Cutting Width', placeholder: 'e.g. 16"' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Gasoline' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 10W-30' },
  ],
  'Chipper/Shredder': [
    { key: 'capacity', label: 'Max Branch Diameter', placeholder: 'e.g. 4"' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Gasoline' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 10W-30' },
    { key: 'chute_size', label: 'Discharge Chute', placeholder: 'e.g. 360° rotating' },
  ],
  'Zero Turn Mower': [
    { key: 'deck_width', label: 'Deck Width', placeholder: 'e.g. 60"' },
    { key: 'engine_hp', label: 'Engine HP', placeholder: 'e.g. 24 HP' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Gasoline' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 10W-30' },
    { key: 'ground_speed', label: 'Max Ground Speed', placeholder: 'e.g. 8 mph' },
  ],
  'Concrete Equipment': [
    { key: 'type', label: 'Type', placeholder: 'e.g. Mixer / Saw / Grinder / Vibrator' },
    { key: 'capacity', label: 'Capacity / Size', placeholder: 'e.g. 6 cu ft / 14" blade' },
    { key: 'fuel_type', label: 'Fuel / Power', placeholder: 'e.g. Gasoline / Electric' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 10W-30' },
    { key: 'blade_type', label: 'Blade/Disc Type', placeholder: 'e.g. Diamond / Segmented' },
  ],
  'Paving Equipment': [
    { key: 'type', label: 'Type', placeholder: 'e.g. Roller / Paver / Crack Sealer' },
    { key: 'operating_weight', label: 'Operating Weight', placeholder: 'e.g. 3,000 lbs' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. 15W-40' },
    { key: 'drum_width', label: 'Drum Width', placeholder: 'e.g. 47"' },
  ],
  'Dump Truck': [
    { key: 'payload', label: 'Payload Capacity', placeholder: 'e.g. 10 tons' },
    { key: 'gvwr', label: 'GVWR', placeholder: 'e.g. 33,000 lbs' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. 15W-40' },
    { key: 'body_type', label: 'Body Type', placeholder: 'e.g. Standard / Side Dump' },
  ],
  'Grader': [
    { key: 'blade_width', label: 'Blade Width', placeholder: 'e.g. 12 ft' },
    { key: 'operating_weight', label: 'Operating Weight', placeholder: 'e.g. 30,000 lbs' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. 15W-40' },
  ],
  'Loader': [
    { key: 'bucket_capacity', label: 'Bucket Capacity', placeholder: 'e.g. 2.0 cu yd' },
    { key: 'lift_capacity', label: 'Lift Capacity', placeholder: 'e.g. 8,000 lbs' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. 15W-40' },
  ],
  'Inflatable': [
    { key: 'dimensions', label: 'Dimensions', placeholder: 'e.g. 15 x 15 ft' },
    { key: 'capacity', label: 'Capacity', placeholder: 'e.g. 6 children / 800 lbs' },
    { key: 'blower_amp', label: 'Blower Requirements', placeholder: 'e.g. 15A / 120V' },
    { key: 'surface_type', label: 'Surface Requirements', placeholder: 'e.g. Grass / Concrete OK with padding' },
    { key: 'anchor_type', label: 'Anchor Type', placeholder: 'e.g. Stakes / Sandbags' },
  ],
  'Dance Floor': [
    { key: 'panel_size', label: 'Panel Size', placeholder: 'e.g. 3 x 3 ft' },
    { key: 'total_area', label: 'Total Area Available', placeholder: 'e.g. up to 20 x 20 ft' },
    { key: 'material', label: 'Material', placeholder: 'e.g. Oak / Black & White / LED' },
    { key: 'max_load', label: 'Max Load', placeholder: 'e.g. 100 lbs/sq ft' },
  ],
  'Staging': [
    { key: 'section_size', label: 'Section Size', placeholder: 'e.g. 4 x 4 ft' },
    { key: 'height_range', label: 'Height Range', placeholder: 'e.g. 24"–48"' },
    { key: 'max_load', label: 'Max Load', placeholder: 'e.g. 125 lbs/sq ft' },
    { key: 'material', label: 'Material', placeholder: 'e.g. Aluminum / Steel' },
    { key: 'guardrail', label: 'Guardrail Available', placeholder: 'e.g. Yes' },
  ],
  'Table': [
    { key: 'dimensions', label: 'Dimensions', placeholder: 'e.g. 6 ft x 30"' },
    { key: 'material', label: 'Material', placeholder: 'e.g. Plastic / Wood' },
    { key: 'max_load', label: 'Weight Capacity', placeholder: 'e.g. 200 lbs' },
    { key: 'folding', label: 'Folding', placeholder: 'e.g. Yes / No' },
  ],
  'Chair': [
    { key: 'type', label: 'Chair Type', placeholder: 'e.g. Folding / Chiavari / Banquet' },
    { key: 'material', label: 'Material', placeholder: 'e.g. Plastic / Wood / Metal' },
    { key: 'max_load', label: 'Weight Capacity', placeholder: 'e.g. 250 lbs' },
    { key: 'color', label: 'Color/Finish', placeholder: 'e.g. White / Gold / Black' },
  ],
  'Fleet Vehicle': [
    { key: 'make_model', label: 'Make / Model', placeholder: 'e.g. Ford F-250' },
    { key: 'year', label: 'Year', placeholder: 'e.g. 2020' },
    { key: 'fuel_type', label: 'Fuel Type', placeholder: 'e.g. Diesel' },
    { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. 5W-40 Synthetic' },
    { key: 'towing_capacity', label: 'Towing Capacity', placeholder: 'e.g. 18,000 lbs' },
    { key: 'gvwr', label: 'GVWR', placeholder: 'e.g. 10,000 lbs' },
    { key: 'license_plate', label: 'License Plate', placeholder: 'e.g. TX ABC1234' },
  ],
  'Tool': [
    { key: 'type', label: 'Tool Type', placeholder: 'e.g. Drill / Saw / Grinder' },
    { key: 'power', label: 'Power Source', placeholder: 'e.g. Electric / Battery / Pneumatic' },
    { key: 'voltage', label: 'Voltage / PSI Required', placeholder: 'e.g. 120V / 90 PSI' },
    { key: 'capacity', label: 'Capacity / Size', placeholder: 'e.g. 1/2" chuck / 7" blade' },
  ],
};

/** Default specs for categories not explicitly listed */
export const DEFAULT_SPECS = [
  { key: 'fuel_type', label: 'Fuel / Power', placeholder: 'e.g. Gasoline / Electric / Diesel' },
  { key: 'oil_type', label: 'Oil Type', placeholder: 'e.g. SAE 10W-30' },
  { key: 'capacity', label: 'Capacity / Rating', placeholder: 'e.g. 500 lbs / 5 tons' },
  { key: 'dimensions', label: 'Dimensions', placeholder: 'e.g. 48" x 24" x 36"' },
];

export function getSpecsTemplate(category) {
  return CATEGORY_SPECS[category] || DEFAULT_SPECS;
}

/**
 * Format specs as a compact string for invoice display.
 * e.g. "kW: 7.5 | Voltage: 120/240V | Oil: SAE 10W-30"
 */
export function formatSpecsForInvoice(specs, category) {
  if (!specs || Object.keys(specs).length === 0) return null;
  const template = getSpecsTemplate(category);
  const labelMap = {};
  template.forEach(t => { labelMap[t.key] = t.label; });

  return Object.entries(specs)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${labelMap[k] || k}: ${v}`)
    .join(' · ');
}