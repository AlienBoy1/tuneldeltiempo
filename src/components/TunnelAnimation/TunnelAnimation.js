import { useEffect, useState } from "react";

/**
 * Componente de animación de túnel del tiempo
 * Crea un efecto visual de túnel que se puede usar en diferentes partes de la app
 */
export default function TunnelAnimation({ 
  children, 
  intensity = "medium",
  className = "",
  variant = "default" // default, subtle, intense
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const intensityClasses = {
    subtle: "opacity-30",
    medium: "opacity-50",
    intense: "opacity-70"
  };

  const variantClasses = {
    default: "tunnel-default",
    subtle: "tunnel-subtle",
    intense: "tunnel-intense"
  };

  return (
    <div className={`tunnel-wrapper ${className} ${isVisible ? 'tunnel-visible' : ''}`}>
      {/* Capas de túnel */}
      <div className={`tunnel-layer tunnel-layer-1 ${variantClasses[variant]}`}></div>
      <div className={`tunnel-layer tunnel-layer-2 ${variantClasses[variant]}`}></div>
      <div className={`tunnel-layer tunnel-layer-3 ${variantClasses[variant]}`}></div>
      
      {/* Contenido */}
      <div className="tunnel-content relative z-10">
        {children}
      </div>
    </div>
  );
}

