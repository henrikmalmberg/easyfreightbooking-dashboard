import React, { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid,
  XAxis, YAxis, Tooltip, ReferenceLine, Legend
} from "recharts";

function euro(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(0)} €`;
}

// Samma piecewise-funktion som i vår kurvlogik
function priceForWeight(cfg, w) {
  const p1   = Number(cfg?.p1) || 0;
  const pp1  = Number(cfg?.price_p1) || 0;
  const p2   = Number(cfg?.p2) || 0;
  const p2k  = Number(cfg?.p2k) || 0;
  const p2m  = Number(cfg?.p2m) || 0;
  const p3k  = Number(cfg?.p3k) || 0;
  const p3m  = Number(cfg?.p3m) || 0;

  if (w <= p1) return pp1;
  if (w <= p2) return p2k * w + p2m;
  return p3k * w + p3m;
}

export default function ModePricingChart({
  config,
  minWeightDefault = 300,
}) {
  const [showPerKg, setShowPerKg] = useState(false);
  const [minW, setMinW] = useState(minWeightDefault);
  const [ftlPrice, setFtlPrice] = useState(() =>
    Math.round(priceForWeight(config, 24000)) || 0
  );

  // 👉 Hooken ska ligga inne i komponenten
  useEffect(() => {
    setFtlPrice(Math.round(priceForWeight(config, 24000)) || 0);
  }, [config]);

  const minAllowed = Math.max(Number(config?.min_allowed_weight_kg) || 0, Number(minW) || 0);
  const maxAllowed = Number(config?.max_weight_kg) || Number(config?.max_allowed_weight_kg) || 25000;
  const p1 = Number(config?.p1) || 0;
  const p2 = Number(config?.p2) || 0;

  const data = useMemo(() => {
    const start = Math.max(minAllowed, 1);
    const end = Math.max(maxAllowed, start + 1);
    const steps = 80;
    const step = (end - start) / steps;
    const arr = [];
    for (let i = 0; i <= steps; i++) {
      const w = Math.round(start + step * i);
      const price = priceForWeight(config, w);
      arr.push({
        w,
        total: price,
        perkg: price / Math.max(w, 1),
        ftl: ftlPrice || null,
      });
    }
    return arr;
  }, [config, minAllowed, maxAllowed, ftlPrice]);

  const yLabel = showPerKg ? "€/kg" : "Total €";

  return (
    <div className="border rounded-lg p-3">
      {/* ...resten oförändrat... */}
    </div>
  );
}
