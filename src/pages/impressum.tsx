import { Page, PageHeading, TopBar } from "@/components/layout/page";
import { LegalFooter } from "./legal-footer";

/** Impressum (§ 5 DDG). Gleiche Angaben wie auf niklasschneider.me. */
export default function ImpressumPage() {
  return (
    <Page withNav={false}>
      <TopBar title="Impressum" />
      <PageHeading eyebrow="SAN VINO" title="Impressum" />
      <article className="legal space-y-4 rounded-[1.75rem] bg-cream/60 p-5 text-[15px] leading-relaxed text-charcoal sm:p-7">
        <p className="rounded-2xl bg-white/70 p-4 text-[14px] text-taupe">
          SAN VINO ist ein privates, nicht-kommerzielles Projekt von Niklas Schneider. Es wird nichts verkauft.
        </p>
        <h2>Angaben gemäß § 5 DDG</h2>
        <Address />
        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href="mailto:kontakt@niklasschneider.me">kontakt@niklasschneider.me</a>
        </p>
        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <Address />
        <h2>Haftung für Inhalte</h2>
        <p>
          Die Weinempfehlungen und Erklärungen entstehen automatisch mit Hilfe künstlicher Intelligenz. Sie können Fehler enthalten und ersetzen keine
          fachliche Beratung. Alkohol ist nur für Erwachsene: Bitte trink verantwortungsvoll.
        </p>
        <h2>Haftung für Links</h2>
        <p>
          Diese App enthält Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe. Für die Inhalte der verlinkten Seiten ist stets der
          jeweilige Anbieter oder Betreiber verantwortlich. Werden mir Rechtsverletzungen bekannt, entferne ich solche Links umgehend.
        </p>
        <p>
          Mehr von mir: <a href="https://niklasschneider.me">niklasschneider.me</a>
        </p>
      </article>
      <LegalFooter />
    </Page>
  );
}

export function Address() {
  return (
    <p>
      Niklas Schneider
      <br />
      Felseckerstraße 8
      <br />
      90489 Nürnberg
      <br />
      Deutschland
    </p>
  );
}
