import { useNavigate } from "react-router";
import { FullScreenError } from "@/components/layout/states";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return <FullScreenError title="Diese Seite gibt es nicht" text="Vielleicht ein Tippfehler im Link? Zurück zur Startseite geht's hier." actionLabel="Zur Startseite" onRetry={() => navigate("/")} />;
}
