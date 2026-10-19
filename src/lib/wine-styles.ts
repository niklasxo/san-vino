/**
 * „Mein Wein“: Empfehlung ohne Weinkarte.
 *
 * Fester Katalog bekannter Weinstile mit TYPISCHEN Geschmackswerten (0–100, gleiche Skala wie die
 * KI-Analyse). Verglichen wird mit demselben Matching-Algorithmus wie beim Scannen – ohne KI,
 * daher sofort, kostenlos und reproduzierbar. Werte sind Stil-Durchschnitte, keine Einzelweine.
 */
import { computeMatch, type MatchResult } from "@shared/matching.ts";
import { type FruitNote, type UserTasteProfile, WINE_DIMENSIONS, type WineType } from "@shared/taste-types.ts";
import type { ExtractedWine } from "@shared/wine-schema.ts";

export interface WineStyle {
  id: string;
  name: string;
  grapes: string[];
  origin: string;
  country: string;
  type: WineType;
  /** sweetness, acidity, body, tannins, fruitiness, oak, spice, intensity */
  taste: [number, number, number, number, number, number, number, number];
  notes: string[];
  fruits: FruitNote[];
  /** Kurz und alltagstauglich: wie schmeckt der Stil? */
  description: string;
  /** Woran man den Stil auf einer Weinkarte erkennt. */
  lookFor: string;
}

const s = (x: WineStyle) => x;

export const WINE_STYLES: WineStyle[] = [
  // ── Rotwein ──
  s({ id: "primitivo", name: "Primitivo", grapes: ["Primitivo"], origin: "Apulien", country: "Italien", type: "red", taste: [15, 45, 80, 55, 85, 40, 35, 80], notes: ["Pflaume", "dunkle Kirsche", "Schokolade"], fruits: ["dark_fruit", "cherry"], description: "Samtig, vollmundig und sehr fruchtig – mit einem Hauch Süße.", lookFor: "Primitivo, Primitivo di Manduria, Zinfandel" }),
  s({ id: "zinfandel", name: "Zinfandel", grapes: ["Zinfandel"], origin: "Kalifornien", country: "USA", type: "red", taste: [12, 45, 80, 55, 85, 45, 45, 80], notes: ["Brombeere", "Gewürze", "Vanille"], fruits: ["blackberry", "dark_fruit"], description: "Üppige dunkle Frucht, warm und leicht würzig.", lookFor: "Zinfandel, Old Vine Zin" }),
  s({ id: "merlot", name: "Merlot", grapes: ["Merlot"], origin: "Bordeaux, Venetien, Chile", country: "Frankreich", type: "red", taste: [8, 50, 65, 50, 70, 35, 20, 60], notes: ["Pflaume", "Kirsche", "Schokolade"], fruits: ["dark_fruit", "cherry"], description: "Weich, rund und unkompliziert – der Allrounder unter den Rotweinen.", lookFor: "Merlot, Saint-Émilion, Pomerol" }),
  s({ id: "cabernet", name: "Cabernet Sauvignon", grapes: ["Cabernet Sauvignon"], origin: "Bordeaux, Kalifornien, Chile", country: "Frankreich", type: "red", taste: [5, 60, 80, 80, 60, 60, 40, 80], notes: ["Schwarze Johannisbeere", "Zedernholz", "Paprika"], fruits: ["blackberry", "dark_fruit"], description: "Kraftvoll und strukturiert, mit festen Gerbstoffen und dunkler Frucht.", lookFor: "Cabernet Sauvignon, Médoc, Bordeaux" }),
  s({ id: "pinot_noir", name: "Spätburgunder / Pinot Noir", grapes: ["Pinot Noir"], origin: "Baden, Burgund, Ahr", country: "Deutschland", type: "red", taste: [5, 65, 45, 35, 65, 30, 20, 45], notes: ["Kirsche", "Himbeere", "Waldboden"], fruits: ["cherry", "raspberry", "red_berries"], description: "Elegant und leicht, mit feiner roter Frucht und wenig Gerbstoff.", lookFor: "Spätburgunder, Pinot Noir, Bourgogne Rouge" }),
  s({ id: "chianti", name: "Chianti Classico", grapes: ["Sangiovese"], origin: "Toskana", country: "Italien", type: "red", taste: [3, 75, 60, 65, 55, 25, 35, 60], notes: ["Sauerkirsche", "Kräuter", "Leder"], fruits: ["cherry"], description: "Frisch und herb mit Sauerkirsche – perfekt zu Pasta und Pizza.", lookFor: "Chianti, Sangiovese, Rosso di Montalcino" }),
  s({ id: "barolo", name: "Barolo", grapes: ["Nebbiolo"], origin: "Piemont", country: "Italien", type: "red", taste: [3, 75, 75, 85, 50, 45, 40, 85], notes: ["Rose", "Teer", "Kirsche"], fruits: ["cherry"], description: "Ein großer, sehr herber Wein mit viel Tiefe – für Kenner kräftiger Weine.", lookFor: "Barolo, Barbaresco, Nebbiolo" }),
  s({ id: "rioja", name: "Rioja Reserva", grapes: ["Tempranillo"], origin: "Rioja", country: "Spanien", type: "red", taste: [5, 55, 70, 60, 55, 70, 40, 70], notes: ["Vanille", "Erdbeere", "Leder"], fruits: ["strawberry", "red_berries"], description: "Weich gereift im Holzfass – Vanille trifft auf rote Frucht.", lookFor: "Rioja Crianza/Reserva, Tempranillo, Ribera del Duero" }),
  s({ id: "malbec", name: "Malbec", grapes: ["Malbec"], origin: "Mendoza", country: "Argentinien", type: "red", taste: [8, 50, 80, 65, 80, 45, 35, 80], notes: ["Brombeere", "Pflaume", "Veilchen"], fruits: ["blackberry", "dark_fruit"], description: "Dunkel, saftig und kräftig – ein Klassiker zum Steak.", lookFor: "Malbec, Mendoza" }),
  s({ id: "shiraz", name: "Shiraz / Syrah", grapes: ["Syrah"], origin: "Australien, Rhône", country: "Australien", type: "red", taste: [8, 50, 85, 65, 80, 45, 70, 85], notes: ["Brombeere", "schwarzer Pfeffer", "Rauch"], fruits: ["blackberry", "dark_fruit"], description: "Voll und würzig mit dunkler Frucht und Pfeffernote.", lookFor: "Shiraz, Syrah, Crozes-Hermitage" }),
  s({ id: "cotes_du_rhone", name: "Côtes du Rhône", grapes: ["Grenache", "Syrah"], origin: "Südliche Rhône", country: "Frankreich", type: "red", taste: [8, 50, 65, 50, 70, 20, 50, 65], notes: ["Erdbeere", "Kräuter der Provence", "Pfeffer"], fruits: ["strawberry", "red_berries"], description: "Saftig, warm und angenehm würzig – ohne zu schwer zu sein.", lookFor: "Côtes du Rhône, Grenache, Garnacha" }),
  s({ id: "beaujolais", name: "Beaujolais", grapes: ["Gamay"], origin: "Beaujolais", country: "Frankreich", type: "red", taste: [5, 65, 35, 25, 80, 5, 15, 40], notes: ["Erdbeere", "Himbeere", "Banane"], fruits: ["strawberry", "raspberry", "red_berries"], description: "Leicht, saftig und fruchtig – ein Rotwein, den man auch gekühlt trinken kann.", lookFor: "Beaujolais, Gamay, Fleurie, Morgon" }),
  s({ id: "ripasso", name: "Valpolicella Ripasso", grapes: ["Corvina"], origin: "Venetien", country: "Italien", type: "red", taste: [12, 55, 75, 55, 75, 40, 40, 75], notes: ["Kirsche", "Rosine", "Kakao"], fruits: ["cherry", "dark_fruit"], description: "Weich und vollmundig mit getrockneter Frucht – fast ein kleiner Amarone.", lookFor: "Ripasso, Valpolicella Superiore" }),
  s({ id: "amarone", name: "Amarone", grapes: ["Corvina"], origin: "Venetien", country: "Italien", type: "red", taste: [15, 50, 90, 65, 80, 50, 50, 95], notes: ["Rosine", "Pflaume", "Schokolade"], fruits: ["dark_fruit", "cherry"], description: "Sehr kräftig, warm und üppig – ein Wein zum Genießen in kleinen Schlucken.", lookFor: "Amarone della Valpolicella" }),
  s({ id: "dornfelder", name: "Dornfelder (lieblich)", grapes: ["Dornfelder"], origin: "Pfalz, Rheinhessen", country: "Deutschland", type: "red", taste: [35, 50, 55, 30, 85, 10, 10, 55], notes: ["Kirsche", "Brombeere", "Holunder"], fruits: ["cherry", "blackberry"], description: "Fruchtig, weich und spürbar süß – sehr zugänglich.", lookFor: "Dornfelder lieblich/halbtrocken, Rotwein lieblich" }),
  s({ id: "montepulciano", name: "Montepulciano d'Abruzzo", grapes: ["Montepulciano"], origin: "Abruzzen", country: "Italien", type: "red", taste: [6, 60, 65, 55, 70, 20, 30, 65], notes: ["Sauerkirsche", "Pflaume", "Kräuter"], fruits: ["cherry", "dark_fruit"], description: "Unkompliziert, saftig und mittelkräftig – der Hauswein Italiens.", lookFor: "Montepulciano d'Abruzzo" }),
  s({ id: "blaufraenkisch", name: "Blaufränkisch / Lemberger", grapes: ["Blaufränkisch"], origin: "Burgenland, Württemberg", country: "Österreich", type: "red", taste: [5, 65, 60, 55, 65, 25, 45, 60], notes: ["Brombeere", "Kirsche", "Pfeffer"], fruits: ["blackberry", "cherry"], description: "Frisch, würzig und dunkelfruchtig mit lebendiger Säure.", lookFor: "Blaufränkisch, Lemberger" }),
  s({ id: "lambrusco", name: "Lambrusco (lieblich)", grapes: ["Lambrusco"], origin: "Emilia-Romagna", country: "Italien", type: "red", taste: [40, 65, 40, 25, 85, 0, 5, 45], notes: ["Kirsche", "Erdbeere", "Veilchen"], fruits: ["cherry", "strawberry"], description: "Prickelnder, süßer Rotwein – fruchtig und unkompliziert.", lookFor: "Lambrusco amabile/dolce" }),
  // ── Weißwein ──
  s({ id: "riesling_dry", name: "Riesling trocken", grapes: ["Riesling"], origin: "Mosel, Rheingau, Pfalz", country: "Deutschland", type: "white", taste: [8, 85, 35, 0, 75, 0, 10, 55], notes: ["Zitrus", "grüner Apfel", "Pfirsich"], fruits: ["citrus", "peach"], description: "Knackig frisch mit viel Säure und Zitrusfrucht.", lookFor: "Riesling trocken, Kabinett trocken, Grosses Gewächs" }),
  s({ id: "riesling_sweet", name: "Riesling feinherb / Spätlese", grapes: ["Riesling"], origin: "Mosel, Nahe", country: "Deutschland", type: "white", taste: [40, 80, 35, 0, 80, 0, 10, 55], notes: ["Pfirsich", "Aprikose", "Honig"], fruits: ["peach", "apricot"], description: "Fruchtig-süß mit frischer Säure – ein schönes Gleichgewicht.", lookFor: "Riesling feinherb, halbtrocken, Spätlese, Kabinett" }),
  s({ id: "pinot_grigio", name: "Grauburgunder / Pinot Grigio", grapes: ["Pinot Gris"], origin: "Baden, Friaul", country: "Deutschland", type: "white", taste: [6, 55, 55, 0, 55, 15, 10, 45], notes: ["Birne", "Mandel", "Pfirsich"], fruits: ["peach"], description: "Mild, rund und angenehm – frisch, aber nicht zu sauer.", lookFor: "Grauburgunder, Pinot Grigio, Pinot Gris" }),
  s({ id: "pinot_blanc", name: "Weißburgunder", grapes: ["Pinot Blanc"], origin: "Pfalz, Baden", country: "Deutschland", type: "white", taste: [5, 60, 50, 0, 55, 10, 5, 40], notes: ["Birne", "Zitrus", "Nuss"], fruits: ["citrus"], description: "Fein, dezent und harmonisch – passt zu fast allem.", lookFor: "Weißburgunder, Pinot Blanc" }),
  s({ id: "sauvignon_blanc", name: "Sauvignon Blanc", grapes: ["Sauvignon Blanc"], origin: "Loire, Neuseeland, Steiermark", country: "Neuseeland", type: "white", taste: [5, 85, 40, 0, 80, 5, 15, 65], notes: ["Stachelbeere", "Maracuja", "Gras"], fruits: ["citrus", "tropical"], description: "Sehr frisch und aromatisch – grün, zitrusfrisch und exotisch.", lookFor: "Sauvignon Blanc, Sancerre, Marlborough" }),
  s({ id: "chardonnay_oak", name: "Chardonnay (im Holz gereift)", grapes: ["Chardonnay"], origin: "Kalifornien, Burgund", country: "USA", type: "white", taste: [6, 55, 75, 0, 60, 70, 15, 70], notes: ["Butter", "Vanille", "reife Ananas"], fruits: ["tropical", "peach"], description: "Cremig und vollmundig mit Vanille und Butter.", lookFor: "Chardonnay Barrique, Meursault, Napa Chardonnay" }),
  s({ id: "chablis", name: "Chablis", grapes: ["Chardonnay"], origin: "Burgund", country: "Frankreich", type: "white", taste: [3, 80, 45, 0, 55, 5, 5, 50], notes: ["Zitrone", "grüner Apfel", "Feuerstein"], fruits: ["citrus"], description: "Klar, mineralisch und frisch – Chardonnay ganz ohne Holz.", lookFor: "Chablis, Petit Chablis" }),
  s({ id: "gruener_veltliner", name: "Grüner Veltliner", grapes: ["Grüner Veltliner"], origin: "Niederösterreich", country: "Österreich", type: "white", taste: [4, 75, 45, 0, 60, 5, 45, 55], notes: ["grüner Apfel", "Zitrus", "weißer Pfeffer"], fruits: ["citrus"], description: "Frisch und knackig mit typischem „Pfefferl“.", lookFor: "Grüner Veltliner, Wachau, Kamptal" }),
  s({ id: "gewuerztraminer", name: "Gewürztraminer", grapes: ["Gewürztraminer"], origin: "Elsass, Pfalz", country: "Frankreich", type: "white", taste: [35, 40, 70, 0, 85, 10, 60, 85], notes: ["Litschi", "Rose", "Ingwer"], fruits: ["tropical", "peach"], description: "Intensiv duftend, exotisch und üppig – oft mit Restsüße.", lookFor: "Gewürztraminer, Traminer" }),
  s({ id: "rivaner", name: "Müller-Thurgau / Rivaner", grapes: ["Müller-Thurgau"], origin: "Franken, Baden", country: "Deutschland", type: "white", taste: [10, 55, 35, 0, 65, 0, 5, 35], notes: ["Muskat", "Zitrus", "Pfirsich"], fruits: ["citrus", "peach"], description: "Leicht, mild und süffig – ein unkomplizierter Sommerwein.", lookFor: "Müller-Thurgau, Rivaner" }),
  s({ id: "albarino", name: "Albariño", grapes: ["Albariño"], origin: "Rías Baixas", country: "Spanien", type: "white", taste: [4, 80, 40, 0, 70, 0, 10, 55], notes: ["Pfirsich", "Zitrus", "Meeresbrise"], fruits: ["citrus", "peach"], description: "Frisch, salzig-mineralisch und fruchtig – ideal zu Fisch.", lookFor: "Albariño, Rías Baixas, Vinho Verde" }),
  s({ id: "lugana", name: "Lugana / Soave", grapes: ["Turbiana", "Garganega"], origin: "Gardasee, Venetien", country: "Italien", type: "white", taste: [5, 65, 45, 0, 60, 5, 5, 45], notes: ["Pfirsich", "Mandel", "Zitrus"], fruits: ["peach", "citrus"], description: "Weich, fruchtig und frisch – sehr beliebt und leicht zu mögen.", lookFor: "Lugana, Soave" }),
  // ── Rosé ──
  s({ id: "provence_rose", name: "Rosé aus der Provence", grapes: ["Grenache", "Cinsault"], origin: "Provence", country: "Frankreich", type: "rose", taste: [4, 70, 35, 10, 70, 0, 10, 40], notes: ["Erdbeere", "Grapefruit", "Kräuter"], fruits: ["strawberry", "red_berries", "citrus"], description: "Blass, trocken und frisch – Sommer im Glas.", lookFor: "Côtes de Provence, Rosé trocken" }),
  s({ id: "sweet_rose", name: "Rosé lieblich", grapes: ["Zinfandel", "Portugieser"], origin: "Kalifornien, Deutschland", country: "USA", type: "rose", taste: [35, 55, 35, 5, 85, 0, 5, 40], notes: ["Erdbeere", "Himbeere", "Bonbon"], fruits: ["strawberry", "raspberry"], description: "Fruchtig, süß und leicht – einfach lecker.", lookFor: "Rosé lieblich/halbtrocken, White Zinfandel, Weißherbst" }),
  // ── Schaumwein ──
  s({ id: "champagne", name: "Champagner brut", grapes: ["Chardonnay", "Pinot Noir"], origin: "Champagne", country: "Frankreich", type: "sparkling", taste: [6, 85, 45, 0, 55, 15, 10, 60], notes: ["Zitrus", "Brioche", "Apfel"], fruits: ["citrus"], description: "Fein prickelnd, trocken und elegant mit Hefe-Noten.", lookFor: "Champagne brut, Crémant" }),
  s({ id: "prosecco", name: "Prosecco", grapes: ["Glera"], origin: "Venetien", country: "Italien", type: "sparkling", taste: [15, 65, 30, 0, 75, 0, 5, 40], notes: ["Birne", "Pfirsich", "Blüten"], fruits: ["peach", "citrus"], description: "Leicht, fruchtig und spritzig – der unkomplizierte Aperitif.", lookFor: "Prosecco (Extra Dry), Prosecco Superiore" }),
  s({ id: "moscato_asti", name: "Moscato d'Asti", grapes: ["Muscat"], origin: "Piemont", country: "Italien", type: "sparkling", taste: [75, 55, 25, 0, 90, 0, 5, 50], notes: ["Pfirsich", "Aprikose", "Orangenblüte"], fruits: ["peach", "apricot"], description: "Süß, leicht perlend und wenig Alkohol – wie frisches Obst.", lookFor: "Moscato d'Asti, Asti Spumante" }),
  // ── Süßwein ──
  s({ id: "sauternes", name: "Edelsüßer Weißwein", grapes: ["Sémillon", "Riesling"], origin: "Sauternes, Mosel", country: "Frankreich", type: "sweet", taste: [90, 65, 80, 0, 85, 40, 20, 85], notes: ["Honig", "Aprikose", "Orangenschale"], fruits: ["apricot", "peach", "tropical"], description: "Konzentriert süß mit frischer Säure – ein Dessert für sich.", lookFor: "Sauternes, Beerenauslese, Eiswein, Tokajer" }),
  s({ id: "port", name: "Portwein (Ruby)", grapes: ["Touriga Nacional"], origin: "Douro", country: "Portugal", type: "sweet", taste: [85, 45, 90, 55, 85, 20, 40, 95], notes: ["Brombeere", "Pflaume", "Schokolade"], fruits: ["dark_fruit", "blackberry"], description: "Süß, warm und sehr kräftig – perfekt zu Käse oder Schokolade.", lookFor: "Port Ruby, LBV, Banyuls" }),
];

/** Katalog-Eintrag → Format der Weinanalyse, damit Matching und Begründungen identisch funktionieren. */
export function styleAsWine(style: WineStyle): ExtractedWine {
  return {
    name: style.name,
    producer: null,
    vintage: null,
    country: style.country,
    region: style.origin,
    grape_varieties: style.grapes,
    wine_type: style.type,
    alcohol_percent: null,
    menu_section: null,
    price: null,
    currency: null,
    price_unit: null,
    price_assignment: "none",
    other_details: [],
    identification_confidence: 0.9,
    evidence: { name: "inferred", producer: "unknown", vintage: "unknown", country: "inferred", region: "inferred", grape_varieties: "inferred", wine_type: "inferred" },
    taste_properties: Object.fromEntries(WINE_DIMENSIONS.map((d, i) => [d, { value: style.taste[i], source: "knowledge" as const }])) as ExtractedWine["taste_properties"],
    typical_notes: style.notes,
    fruit_note_keys: style.fruits,
  };
}

export interface StyleRecommendation {
  style: WineStyle;
  wine: ExtractedWine;
  match: MatchResult;
}

/** Alle Stile nach Passung sortiert (beste zuerst). */
export function recommendStyles(profile: UserTasteProfile): StyleRecommendation[] {
  return WINE_STYLES.map((style) => {
    const wine = styleAsWine(style);
    return { style, wine, match: computeMatch(profile, wine) };
  }).sort((a, b) => b.match.score - a.match.score);
}
