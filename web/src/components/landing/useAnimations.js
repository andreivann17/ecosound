import { useState, useEffect, useRef } from "react";

/**
 * Hook que detecta cuando un elemento entra al viewport.
 * Devuelve [ref, isVisible]. Una vez visible, NO se vuelve a ocultar.
 */
export function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible];
}

/**
 * Hook que anima un contador de 0 hasta `target` cuando `start` es true.
 * Soporta prefijos/sufijos: "500+", "99%", "1 día", "12+", "1,200"
 */
export function useCountUp(target, start, duration = 1600) {
  const [value, setValue] = useState(0);

  // Extrae el número y guarda prefijo/sufijo
  const { num, prefix, suffix } = parseTarget(target);

  useEffect(() => {
    if (!start || num === null) return;
    let frame;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(num * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [start, num, duration]);

  if (num === null) return target; // texto puro como "1 día"
  return `${prefix}${value.toLocaleString("es-MX")}${suffix}`;
}

function parseTarget(str) {
  if (typeof str !== "string") return { num: Number(str) || 0, prefix: "", suffix: "" };
  const match = str.match(/^([^\d]*)([\d,]+)(.*)$/);
  if (!match) return { num: null, prefix: "", suffix: "" };
  const num = parseInt(match[2].replace(/,/g, ""), 10);
  if (isNaN(num)) return { num: null, prefix: "", suffix: "" };
  return { num, prefix: match[1], suffix: match[3] };
}
