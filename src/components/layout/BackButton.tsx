import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type Props = {
  /** A dónde caer si no hay historial válido en la app */
  fallbackTo?: string;
  label?: string;
  className?: string;
};

export default function BackButton({
  fallbackTo = "/",
  label = "Atrás",
  className,
}: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Si hay historial y venimos del mismo origen, retrocede
    const fromSameOrigin =
      document.referrer && document.referrer.startsWith(location.origin);

    if (window.history.length > 1 && fromSameOrigin) {
      navigate(-1);
    } else {
      // Si no, ve a una ruta válida de tu app
      navigate(fallbackTo);
    }
  };

  return (
    <Button variant="ghost" onClick={handleClick} className={`gap-2 ${className || ""}`}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
