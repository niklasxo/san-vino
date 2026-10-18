/**
 * ⚠️ DEMO-DATEN ⚠️
 * Frei erfundene Beispielweine & Produzenten für den Demo-Modus und Tests.
 * Sie stammen NICHT aus einer KI-Analyse und werden nie in Supabase gespeichert.
 */
import type { ExtractedWine } from "@shared/wine-schema.ts";
import type { FruitNote, PropertySource, WineDimension, WineType } from "@shared/taste-types.ts";

type Props = Partial<Record<WineDimension, number | [number, PropertySource]>>;

const DIMS: WineDimension[] = ["sweetness", "acidity", "body", "tannins", "fruitiness", "oak", "spice", "intensity"];

export function demoWine(input: {
  name: string | null;
  producer?: string | null;
  vintage?: number | null;
  country?: string | null;
  region?: string | null;
  grapes?: string[];
  type: WineType;
  confidence: number;
  props: Props;
  notes?: string[];
  fruit?: FruitNote[];
  price?: number | null;
  unit?: ExtractedWine["price_unit"];
  priceAssignment?: ExtractedWine["price_assignment"];
  section?: string | null;
  alcohol?: number | null;
  visible?: boolean;
}): ExtractedWine {
  const ev = (v: unknown, inferred = false) => (v == null || (Array.isArray(v) && v.length === 0) ? "unknown" : inferred ? "inferred" : "visible");
  const taste = Object.fromEntries(
    DIMS.map((d) => {
      const p = input.props[d];
      if (p == null) return [d, { value: null, source: "unknown" }];
      const [value, source] = Array.isArray(p) ? p : [p, "knowledge" as PropertySource];
      return [d, { value, source }];
    }),
  ) as ExtractedWine["taste_properties"];
  return {
    name: input.name,
    producer: input.producer ?? null,
    vintage: input.vintage ?? null,
    country: input.country ?? null,
    region: input.region ?? null,
    grape_varieties: input.grapes ?? [],
    wine_type: input.type,
    alcohol_percent: input.alcohol ?? null,
    menu_section: input.section ?? null,
    price: input.price ?? null,
    currency: input.price != null ? "EUR" : null,
    price_unit: input.price != null ? (input.unit ?? "glass") : null,
    price_assignment: input.priceAssignment ?? (input.price != null ? "clear" : "none"),
    other_details: [],
    identification_confidence: input.confidence,
    evidence: {
      name: ev(input.name),
      producer: ev(input.producer),
      vintage: ev(input.vintage),
      country: ev(input.country, input.visible === false),
      region: ev(input.region, input.visible === false),
      grape_varieties: ev(input.grapes, input.visible === false),
      wine_type: input.type === "unknown" ? "unknown" : "inferred",
    },
    taste_properties: taste,
    typical_notes: input.notes ?? [],
    fruit_note_keys: input.fruit ?? [],
  };
}

// ─────────────── Einzelne Flaschen ───────────────

export const DEMO_PRIMITIVO = demoWine({
  name: "Primitivo di Manduria",
  producer: "Masseria del Sole (Demo)",
  vintage: 2021,
  country: "Italien",
  region: "Apulien",
  grapes: ["Primitivo"],
  type: "red",
  confidence: 0.91,
  alcohol: 14.5,
  props: { sweetness: 18, acidity: 42, body: 78, tannins: 52, fruitiness: 88, oak: 40, spice: 38, intensity: 78 },
  notes: ["reife Kirsche", "Pflaume", "Brombeere", "etwas Vanille"],
  fruit: ["cherry", "blackberry", "dark_fruit"],
});

export const DEMO_RIESLING = demoWine({
  name: "Riesling trocken „Schieferblick“",
  producer: "Weingut Morgentau (Demo)",
  vintage: 2023,
  country: "Deutschland",
  region: "Mosel",
  grapes: ["Riesling"],
  type: "white",
  confidence: 0.88,
  alcohol: 11.5,
  props: { sweetness: 12, acidity: 82, body: 30, tannins: 0, fruitiness: 62, oak: 0, spice: 10, intensity: 45 },
  notes: ["Zitrus", "grüner Apfel", "Pfirsich"],
  fruit: ["citrus", "peach"],
});

export const DEMO_UNCERTAIN = demoWine({
  name: "Cuvée Nr. 7",
  type: "red",
  confidence: 0.28,
  props: { body: [60, "style_estimate"], fruitiness: [60, "style_estimate"] },
  visible: false,
});

export const DEMO_ROSE = demoWine({
  name: "Rosé de Provence",
  producer: "Domaine des Demoiselles (Demo)",
  vintage: 2023,
  country: "Frankreich",
  region: "Provence",
  grapes: ["Grenache", "Cinsault"],
  type: "rose",
  confidence: 0.84,
  props: { sweetness: 10, acidity: 62, body: 32, tannins: 5, fruitiness: 70, oak: 0, spice: 10, intensity: 38 },
  notes: ["Erdbeere", "Himbeere", "Grapefruit"],
  fruit: ["strawberry", "raspberry", "citrus"],
});

/** Reihenfolge, in der Demo-Flaschenscans Ergebnisse liefern. */
export const DEMO_BOTTLE_SEQUENCE: ExtractedWine[][] = [
  [DEMO_PRIMITIVO],
  [DEMO_RIESLING],
  [DEMO_UNCERTAIN],
  [DEMO_ROSE, DEMO_PRIMITIVO], // mehrere Flaschen auf einem Foto
];

// ─────────────── Weinkarte ───────────────

export const DEMO_MENU: ExtractedWine[] = [
  { ...DEMO_PRIMITIVO, producer: null, vintage: null, price: 8.5, currency: "EUR", price_unit: "glass", price_assignment: "clear", menu_section: "Rotweine · offen", identification_confidence: 0.72, evidence: { ...DEMO_PRIMITIVO.evidence, producer: "unknown", vintage: "unknown" } },
  demoWine({
    name: "Merlot",
    region: "Venetien",
    country: "Italien",
    grapes: ["Merlot"],
    type: "red",
    confidence: 0.6,
    props: { sweetness: 15, acidity: 45, body: 60, tannins: 42, fruitiness: 78, oak: [30, "style_estimate"], spice: [20, "style_estimate"], intensity: 58 },
    notes: ["Pflaume", "Kirsche", "weich"],
    fruit: ["cherry", "dark_fruit"],
    price: 7,
    section: "Rotweine · offen",
  }),
  demoWine({
    name: "Barolo DOCG",
    producer: "Cascina Nebbia (Demo)",
    vintage: 2018,
    country: "Italien",
    region: "Piemont",
    grapes: ["Nebbiolo"],
    type: "red",
    confidence: 0.86,
    props: { sweetness: 5, acidity: 76, body: 80, tannins: 88, fruitiness: 45, oak: 55, spice: 55, intensity: 85 },
    notes: ["Rose", "Teer", "Sauerkirsche"],
    fruit: ["cherry"],
    price: 89,
    unit: "bottle",
    section: "Rotweine · Flasche",
  }),
  demoWine({
    name: "Grauburgunder trocken",
    producer: "Weingut Lindenhof (Demo)",
    country: "Deutschland",
    region: "Pfalz",
    grapes: ["Grauburgunder"],
    type: "white",
    confidence: 0.75,
    props: { sweetness: 12, acidity: 55, body: 55, tannins: 0, fruitiness: 62, oak: 15, spice: 15, intensity: 52 },
    notes: ["Birne", "Mandel", "gelber Apfel"],
    fruit: ["peach"],
    price: 6.5,
    section: "Weißweine",
  }),
  demoWine({
    name: "Sauvignon Blanc",
    region: "Marlborough",
    country: "Neuseeland",
    grapes: ["Sauvignon Blanc"],
    type: "white",
    confidence: 0.62,
    props: { sweetness: 8, acidity: 85, body: 35, tannins: 0, fruitiness: 75, oak: 0, spice: 10, intensity: 70 },
    notes: ["Stachelbeere", "Limette", "Passionsfrucht"],
    fruit: ["citrus", "tropical"],
    price: 7.5,
    section: "Weißweine",
  }),
  demoWine({
    name: "Riesling Spätlese",
    producer: "Weingut Morgentau (Demo)",
    country: "Deutschland",
    region: "Rheingau",
    grapes: ["Riesling"],
    type: "white",
    confidence: 0.78,
    props: { sweetness: 58, acidity: 72, body: 40, tannins: 0, fruitiness: 82, oak: 0, spice: 10, intensity: 55 },
    notes: ["Aprikose", "Pfirsich", "Honig"],
    fruit: ["apricot", "peach"],
    price: 7.9,
    section: "Weißweine",
  }),
  { ...DEMO_ROSE, price: 7, currency: "EUR", price_unit: "glass", price_assignment: "clear", menu_section: "Rosé" },
  demoWine({
    name: "Prosecco DOC Extra Dry",
    country: "Italien",
    region: "Venetien",
    grapes: ["Glera"],
    type: "sparkling",
    confidence: 0.7,
    props: { sweetness: 35, acidity: 65, body: 25, tannins: 0, fruitiness: 72, oak: 0, spice: 5, intensity: 40 },
    notes: ["grüner Apfel", "Birne", "Blüten"],
    fruit: ["peach", "citrus"],
    price: 6,
    section: "Schaumwein",
  }),
  demoWine({
    name: "Hauswein rot",
    type: "red",
    confidence: 0.35,
    props: { body: [55, "style_estimate"], fruitiness: [60, "style_estimate"] },
    price: 5.5,
    priceAssignment: "uncertain",
    section: "Rotweine · offen",
    visible: false,
  }),
];
