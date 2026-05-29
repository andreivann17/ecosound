import React from "react";
import { useReveal } from "./useAnimations";

/**
 * Envuelve children con animación de entrada al hacer scroll.
 * variant: "fade-up" | "fade" | "fade-left" | "fade-right" | "zoom"
 * delay: ms (escalonado para hijos)
 */
export default function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  threshold = 0.15,
  className = "",
  as: Tag = "div",
}) {
  const [ref, visible] = useReveal(threshold);

  return (
    <Tag
      ref={ref}
      className={`reveal reveal-${variant} ${visible ? "reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
