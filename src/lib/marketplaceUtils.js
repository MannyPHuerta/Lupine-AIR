import { BRANCH_DATA } from "./branchData";

// Maps item type to Craigslist category code and FB Marketplace category
export const CATEGORY_MAP = {
  "Excavator":         { cl: "hea", fb: "heavy_equipment" },
  "Loader":            { cl: "hea", fb: "heavy_equipment" },
  "Trencher":          { cl: "hea", fb: "heavy_equipment" },
  "Grader":            { cl: "hea", fb: "heavy_equipment" },
  "Bulldozer":         { cl: "hea", fb: "heavy_equipment" },
  "Backhoe":           { cl: "hea", fb: "heavy_equipment" },
  "Skid Steer":        { cl: "hea", fb: "heavy_equipment" },
  "Compactor":         { cl: "hea", fb: "heavy_equipment" },
  "Paving Equipment":  { cl: "hea", fb: "heavy_equipment" },
  "Concrete Mixer":    { cl: "hea", fb: "heavy_equipment" },
  "Crane":             { cl: "hea", fb: "heavy_equipment" },
  "Forklift":          { cl: "hea", fb: "heavy_equipment" },
  "Scissor Lift":      { cl: "hea", fb: "heavy_equipment" },
  "Boom Lift":         { cl: "hea", fb: "heavy_equipment" },
  "Telehandler":       { cl: "hea", fb: "heavy_equipment" },
  "Dump Truck":        { cl: "tru", fb: "trucks" },
  "Generator":         { cl: "tls", fb: "tools" },
  "Compressor":        { cl: "tls", fb: "tools" },
  "Other":             { cl: "hea", fb: "heavy_equipment" },
};

// Craigslist subregion codes by city
const CL_SUBREGION = {
  "Corpus Christi": { site: "corpuschristi", area: "" },
  "Brownsville":    { site: "rgv", area: "brn" },
  "Harlingen":      { site: "rgv", area: "hrl" },
  "Harlingen Warehouse": { site: "rgv", area: "hrl" },
  "McAllen":        { site: "rgv", area: "mcl" },
  "Weslaco":        { site: "rgv", area: "wsl" },
};

export function buildDescription(report) {
  const branch = BRANCH_DATA[report.branch];
  const lines = [];
  lines.push(`FOR SALE: ${report.itemName}`);
  if (report.model) lines.push(`Make/Model: ${report.model}`);
  if (report.serialNumber) lines.push(`Serial #: ${report.serialNumber}`);
  if (report.assetNumber) lines.push(`Asset #: ${report.assetNumber}`);
  if (report.comments) lines.push(`\nCondition / Notes:\n${report.comments}`);
  if (branch) {
    lines.push(`\nLocation: ${branch.address}`);
    lines.push(`Contact: ${branch.phone}`);
  }
  lines.push("\nRental World LLC — rentalworld.com");
  return lines.join("\n");
}

export function buildCraigslistURL(report) {
  const category = CATEGORY_MAP[report.itemType] || CATEGORY_MAP["Other"];
  const region = CL_SUBREGION[report.branch] || { site: "rgv", area: "" };
  const areaPath = region.area ? `/${region.area}` : "";
  // Craigslist doesn't support URL pre-fill; link directly to the new post form for the right region/category
  return `https://${region.site}.craigslist.org${areaPath}/post?category=${category.cl}`;
}

export function buildFacebookMarketplaceURL(report) {
  const description = buildDescription(report);
  const branch = BRANCH_DATA[report.branch];

  const params = new URLSearchParams({
    title: report.itemName,
    price: report.askingPrice ? String(report.askingPrice) : "",
    description,
    location: branch ? branch.city : "",
  });

  return `https://www.facebook.com/marketplace/create/item?${params.toString()}`;
}