import React from "react";
import { useReveal, useCountUp } from "./useAnimations";

/**
 * Stat con número animado tipo contador.
 * Se dispara cuando entra al viewport.
 */
export default function CountUpStat({
  num,
  label,
  duration = 1800,
  className = "landing-stat",
  numClassName,
  labelClassName,
}) {
  const [ref, visible] = useReveal(0.3);
  const value = useCountUp(num, visible, duration);

  // Si pasas className "events-stat" inferimos sus hijos events-stat-num/label
  const base = className.split(" ")[0];
  const finalNumCls = numClassName || `${base}-num`;
  const finalLabelCls = labelClassName || `${base}-label`;

  return (
    <div ref={ref} className={className}>
      <span className={finalNumCls}>{value}</span>
      <span className={finalLabelCls}>{label}</span>
    </div>
  );
}
