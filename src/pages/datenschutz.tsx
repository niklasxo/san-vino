import { Page, PageHeading, TopBar } from "@/components/layout/page";
import { Address } from "./impressum";
import { LegalFooter } from "./legal-footer";

/**
 * Datenschutzerklärung. Grundlage: docs/DATENSCHUTZ.md (welche Daten wohin fließen). Bei jeder
 * Änderung an Diensten, Speicherorten oder Datenflüssen hier mitziehen und „Stand“ anpassen.
 */
export default function DatenschutzPage() {
  return (
    <Page withNav={false}>
      <TopBar title="Datenschutz" />
      <PageHeading eyebrow="SAN VINO" title="Datenschutz" />
      <article className="legal space-y-4 rounded-[1.75rem] bg-cream/60 p-5 text-[15px] leading-relaxed text-charcoal sm:p-7">
        <p>
          SAN VINO verwendet keine Analyse- oder Tracking-Werkzeuge, keine Werbung und keine Cookies. Im Folgenden steht, welche Daten trotzdem anfallen,
          wohin sie gehen und warum.
        </p>

        <h2>1. Verantwortlicher</h2>
        <Address />
        <p>
          E-Mail: <a href="mailto:kontakt@niklasschneider.me">kontakt@niklasschneider.me</a>
        </p>

        <h2>2. Hosting bei Vercel</h2>
        <p>
          Die App wird von Vercel Inc. (USA) ausgeliefert. Beim Aufruf verarbeitet Vercel technisch notwendige Daten wie IP-Adresse, Zeitpunkt, aufgerufene
          Adresse und Browser, um die App auszuliefern und vor Angriffen zu schützen; diese Protokolle werden nach kurzer Zeit gelöscht. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. f DSGVO. Vercel ist nach dem EU-US Data Privacy Framework zertifiziert.
        </p>

        <h2>3. Deine Daten in der App (Supabase)</h2>
        <p>
          Du nutzt SAN VINO ohne Konto, E-Mail oder Namen. Beim Start legt die App eine anonyme Nutzer-ID an. Gespeichert werden in der Datenbank von Supabase
          Inc. (Serverstandort Frankfurt am Main):
        </p>
        <ul>
          <li>deine Antworten aus dem Einstieg und dein Geschmacksprofil,</li>
          <li>die Fotos deiner Scans (Etiketten, Weinkarten), privat und ohne Standort- oder Kameradaten,</li>
          <li>erkannte Weine, Bewertungen, Notizen und gespeicherte Weine,</li>
          <li>ein Zähler, wie oft du die KI genutzt hast (gegen Missbrauch).</li>
        </ul>
        <p>
          Nur du kommst über deine anonyme ID an diese Daten. Sicher erkannte Weine (nur Weindaten, ohne Bezug zu dir) landen in einem gemeinsamen Weinkatalog.
          Rechtsgrundlage ist die Bereitstellung der App, die du nutzen möchtest (Art. 6 Abs. 1 lit. b DSGVO).
        </p>
        <p>
          Löschen: einzelne Scans über das Papierkorb-Symbol, alles zusammen unter <i>Mein Geschmack → Alle meine Daten löschen</i>.
        </p>

        <h2>4. Weinerkennung mit Google Gemini</h2>
        <p>
          Wenn du ein Foto scannst, wird es zur Erkennung an die Gemini API von Google übermittelt (Google Ireland Limited, Gordon House, Barrow Street,
          Dublin 4, Irland, bzw. Google LLC, USA). Für die Erklärungen, warum ein Wein zu dir passt, gehen dein zusammengefasstes Geschmacksprofil und die
          Weindaten an Gemini. SAN VINO nutzt den kostenlosen Tarif der Gemini API: Nach den Bedingungen von Google kann Google dabei Ein- und Ausgaben zur
          Verbesserung seiner Dienste verwenden, auch durch Menschen geprüft. Fotografiere deshalb bitte nur Etiketten und Karten, keine Personen oder
          persönlichen Unterlagen. Eine Übertragung in die USA ist möglich; Google ist nach dem EU-US Data Privacy Framework zertifiziert. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. b DSGVO (die Erkennung ist die Funktion, die du auslöst).
        </p>

        <h2>5. Speicher im Browser</h2>
        <p>
          Damit du ohne Konto angemeldet bleibst, speichert dein Browser den Sitzungsschlüssel im Local Storage („vino-session“). Außerdem merkt er sich zur
          schnelleren Anzeige zuletzt geladene Daten und, falls du eine andere Sprache wählst, diese Sprache („ns.tlang“). Nur für die Dauer des Besuchs liegen
          im Session Storage zwei Merker: ob die Demo läuft und ob die App nach einem Fehler gerade neu geladen wurde. Das ist für die von dir gewünschten
          Funktionen unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Löschst du die Website-Daten in deinem Browser, ist der Zugang zu deinem anonymen Profil
          weg.
        </p>

        <h2 id="uebersetzung">6. Übersetzung</h2>
        <p>
          Über das Sprachmenü kannst du die App maschinell übersetzen lassen. Solange du Deutsch liest, passiert dabei nichts. Wählst du eine andere Sprache,
          schickt dein Browser die Texte der Seite an niklasschneider.me (ebenfalls von mir betrieben), wo sie mit Cloudflare Workers AI übersetzt werden
          (Cloudflare, Inc., USA; nach dem EU-US Data Privacy Framework zertifiziert). Übertragen werden nur die Texte der Seite und die technisch nötigen
          Verbindungsdaten wie deine IP-Adresse; die Übersetzungen werden ohne Bezug zu dir gespeichert. Rechtsgrundlage ist die von dir gewünschte Funktion
          (Art. 6 Abs. 1 lit. b DSGVO).
        </p>

        <h2>7. Schriftarten</h2>
        <p>Alle Schriftarten werden direkt mit der App ausgeliefert. Es besteht keine Verbindung zu Google Fonts.</p>

        <h2>8. Deine Rechte</h2>
        <p>Du hast das Recht auf</p>
        <ul>
          <li>Auskunft über deine gespeicherten Daten (Art. 15 DSGVO),</li>
          <li>Berichtigung (Art. 16 DSGVO) und Löschung (Art. 17 DSGVO),</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
          <li>Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21 DSGVO).</li>
        </ul>
        <p>
          Wende dich dafür einfach per E-Mail an mich. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel beim Bayerischen
          Landesamt für Datenschutzaufsicht, Promenade 18, 91522 Ansbach.
        </p>
        <p className="text-[13px] text-taupe">Stand: Oktober 2026</p>
      </article>
      <LegalFooter />
    </Page>
  );
}
