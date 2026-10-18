import type { TasteTypeId } from "./taste-type";

/** Kleine, allgemeine Wein-Tipps je Geschmackstyp (redaktionell, keine KI). */
export const TASTE_TIPS: Record<TasteTypeId, { title: string; text: string }[]> = {
  fruity: [
    { title: "Probier mal Primitivo", text: "Reife dunkle Früchte und eine weiche Art – ein Klassiker für Frucht-Fans." },
    { title: "Spätburgunder aus Deutschland", text: "Kirsche, Erdbeere und wenig Herbe: zugänglich und unkompliziert." },
  ],
  fresh: [
    { title: "Riesling trocken", text: "Zitrus, grüner Apfel und viel Frische – perfekt, wenn du es spritzig magst." },
    { title: "Grüner Veltliner", text: "Leicht, frisch und mit einem Hauch Pfeffer. Toll zu Salat und Fisch." },
  ],
  elegant: [
    { title: "Chablis", text: "Trocken, klar und ohne Holz-Wucht – Eleganz in Reinform." },
    { title: "Pinot Noir aus dem Burgund", text: "Fein, ausgewogen und nie zu laut." },
  ],
  bold: [
    { title: "Malbec aus Argentinien", text: "Dunkle Frucht, viel Kraft und trotzdem samtig." },
    { title: "Syrah von der Rhône", text: "Kräftig, würzig und mit Charakter – passt zu Gegrilltem." },
  ],
  sweet: [
    { title: "Riesling Spätlese", text: "Fruchtig-süß mit lebendiger Frische, sodass er nie klebrig wirkt." },
    { title: "Moscato d'Asti", text: "Leicht perlend, süß und herrlich nach Pfirsich duftend." },
  ],
  spicy: [
    { title: "Rioja Reserva", text: "Vanille, Gewürze und reife Frucht – dank Holzfass schön würzig." },
    { title: "Zinfandel", text: "Saftig, würzig und intensiv – ideal für Entdecker." },
  ],
};

export function tipFor(type: TasteTypeId, seed = new Date().getDate()) {
  const tips = TASTE_TIPS[type];
  return tips[seed % tips.length];
}
