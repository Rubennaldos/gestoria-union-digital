import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type Props = {
  /** A dónde caer si no hay historial válido en la app */
  fallbackTo?: string;
  label?: string;
  className?: string;
  /** Si true, usa el ícono de Home en lugar de ArrowLeft */
  homeIcon?: boolean;
};

export default function BackButton({
  fallbackTo = "/",
  label = "Inicio",
  className,
  homeIcon = true,
}: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Si hay historial y venimos del mismo origen, retrocede
    const fromSameOrigin =
      document.referrer && document.referrer.startsWith(location.origin);

    if (window.history.length > 1 && fromSameOrigin && !homeIcon) {
      navigate(-1);
    } else {
      // Si no, ve a una ruta válida de tu app
      navigate(fallbackTo);
    }
  };

  const Icon = homeIcon ? Home : ArrowLeft;

  return (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={handleClick} 
      className={`gap-1.5 h-8 md:h-9 px-2 md:px-3 group relative overflow-hidden transition-all hover:scale-105 hover:shadow-md ${className || ""}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 relative z-10 transition-transform group-hover:-translate-x-0.5" />
      <span className="text-xs md:text-sm relative z-10">{label}</span>
    </Button>
  );
}
