import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid,
  XAxis, YAxis, Tooltip, ReferenceLine, Legend
} from "recharts";

function euro(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(0)} €`;
}

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
  const boxRef = useRef(null);
  const [boxW, setBoxW] = useState(0);

  // Mät bredden på containern (för att undvika 0 px)
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => setBoxW(el.offsetWidth || 0));
    ro.observe(el);
    // initvärde
    setBoxW(el.offsetWidth || 0);
    return () => ro.disconnect();
  }, []);

  const [showPerKg, setShowPerKg] = useState(false);
  const [minW, setMinW] = useState(minWeightDefault);
  const [ftlPrice, setFtlPrice] = useState(() =>
    Math.round(priceForWeight(config, 24000)) || 0
  );

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
      arr.push({ w, total: price, perkg: price / Math.max(w, 1), ftl: ftlPrice || null });
    }
    return arr;
  }, [config, minAllowed, maxAllowed, ftlPrice]);

  const yLabel = showPerKg ? "€/kg" : "Total €";

  return (
    <div ref={boxRef} className="border rounded-lg p-3 min-w-[320px]">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <div className="font-semibold">Pricing preview</div>
          <div className="text-xs text-gray-500">Dynamiskt från parametrarna</div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={showPerKg} onChange={(e) => setShowPerKg(e.target.checked)} />
            Visa €/kg
          </label>
          <label className="flex items-center gap-1">
            <span className="text-gray-500">Min weight</span>
            <input
              type="number"
              className="border rounded px-2 py-1 w-24"
              value={minW}
              min={0}
              onChange={(e) => setMinW(Number(e.target.value))}
              title="Minsta vikt i x-axeln (påverkar inte config)"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-gray-500">FTL pris (simulering)</span>
            <input
              type="number"
              className="border rounded px-2 py-1 w-28"
              value={ftlPrice}
              onChange={(e) => setFtlPrice(Number(e.target.value))}
              title="Påverkar endast grafen, inte calculate/backend"
            />
          </label>
        </div>
      </div>

      {/* Rendera grafen först när vi vet att containern har >0 px bredd */}
      {boxW > 0 ? (
        <div className="w-full h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="w"
                type="number"
                domain={[minAllowed, Math.max(minAllowed + 1, maxAllowed)]}
                tickFormatter={(v) => `${v}`}
                label={{ value: "Weight (kg)", position: "insideBottom", offset: -2 }}
              />
              <YAxis
                tickFormatter={(v) => (showPerKg ? Number(v).toFixed(2) : Math.round(Number(v)))}
                label={{ value: yLabel, angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "total") return [euro(value), "Total"];
                  if (name === "perkg") return [`${Number(value).toFixed(2)} €/kg`, "€/kg"];
                  if (name === "ftl") return [euro(value), "FTL (sim)"];
                  return [value, name];
                }}
                labelFormatter={(w) => `Weight: ${w} kg`}
              />
              <Legend />
              {p1 > 0 && <ReferenceLine x={p1} stroke="#888" strokeDasharray="4 4" label={{ value: "p1", position: "top" }} />}
              {p2 > 0 && <ReferenceLine x={p2} stroke="#888" strokeDasharray="4 4" label={{ value: "p2", position: "top" }} />}
              {!showPerKg && <Line type="monotone" dataKey="total" name="Total" dot={false} />}
              {showPerKg  && <Line type="monotone" dataKey="perkg" name="€/kg" dot={false} />}
              {Number.isFinite(ftlPrice) && ftlPrice > 0 && (
                <ReferenceLine y={ftlPrice} stroke="#555" strokeDasharray="2 2" label={{ value: `FTL ${euro(ftlPrice)}`, position: "right" }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[360px] flex items-center justify-center text-sm text-gray-500">
          Measuring container…
        </div>
      )}

      <div className="mt-2 text-xs text-gray-600">
        Obs: FTL-priset här är en <strong>ren simulering</strong> i UI:t. Det sparas inte och används inte av <code>/calculate</code>.
      </div>
    </div>
  );
}
