import React from "react";

const API = "https://easyfreightbooking-api.onrender.com";
const token = () => localStorage.getItem("jwt") || "";
const hdrs = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + token() });

export default function AllOrganizations() {
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch(`${API}/admin/organizations?search=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`, { headers: hdrs() });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setRows(j.items || []);
      setTotal(j.total || 0);
    } catch (e) {
      setMsg("❌ " + (e.message || e));
    } finally {
      setLoading(false);
    }
  }, [q, page, pageSize]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const updateRow = async (id, patch) => {
    setMsg("");
    try {
      const r = await fetch(`${API}/admin/organizations/${id}`, {
        method: "PUT", headers: hdrs(), body: JSON.stringify(patch)
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setRows((prev) => prev.map(x => x.id === id ? j : x));
      setMsg("✅ Saved");
    } catch (e) {
      setMsg("❌ " + (e.message || e));
    }
  };

  const onCellChange = (id, key, value) => {
    setRows(prev => prev.map(x => x.id === id ? { ...x, [key]: value } : x));
  };

  const saveRow = (row) => {
    const patch = {
      company_name: row.company_name,
      vat_number: row.vat_number,
      address: row.address,
      postal_code: row.postal_code,
      country_code: row.country_code,
      invoice_email: row.invoice_email,
      payment_terms_days: row.payment_terms_days,
      currency: row.currency,
    };
    updateRow(row.id, patch);
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold">All Organizations</h1>
          <p className="text-sm text-gray-600">Search, edit, and manage organizations.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Global search (name, VAT, email)"
            className="border rounded px-3 py-2 w-80"
            value={q}
            onChange={(e)=>{ setQ(e.target.value); setPage(1); }}
          />
          <select className="border rounded px-2 py-2" value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }}>
            {[10,25,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>
        </div>
      </div>

      {msg && <div className="mb-2 text-sm">{msg}</div>}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2 w-56">Company</th>
              <th className="px-3 py-2 w-40">VAT</th>
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2 w-28">Postal</th>
              <th className="px-3 py-2 w-24">Country</th>
              <th className="px-3 py-2 w-48">Invoice email</th>
              <th className="px-3 py-2 w-28">Terms (days)</th>
              <th className="px-3 py-2 w-24">Currency</th>
              <th className="px-3 py-2 w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1" value={r.company_name} onChange={(e)=>onCellChange(r.id,"company_name", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1" value={r.vat_number} onChange={(e)=>onCellChange(r.id,"vat_number", e.target.value.toUpperCase())} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1" value={r.address || ""} onChange={(e)=>onCellChange(r.id,"address", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1" value={r.postal_code || ""} onChange={(e)=>onCellChange(r.id,"postal_code", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1 uppercase" value={r.country_code || ""} onChange={(e)=>onCellChange(r.id,"country_code", e.target.value.toUpperCase())} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1" value={r.invoice_email || ""} onChange={(e)=>onCellChange(r.id,"invoice_email", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min="0" max="120" className="w-full border rounded px-2 py-1 text-right" value={r.payment_terms_days ?? 0} onChange={(e)=>onCellChange(r.id,"payment_terms_days", Number(e.target.value))} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1 uppercase" value={r.currency || "EUR"} onChange={(e)=>onCellChange(r.id,"currency", e.target.value.toUpperCase())} />
                </td>
                <td className="px-3 py-2">
                  <button onClick={()=>saveRow(r)} disabled={loading} className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                    Save
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">{loading ? "Loading…" : "No organizations"}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-sm">
        <div>Total: {total}</div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          <span>Page {page} / {pages}</span>
          <button className="px-2 py-1 border rounded" disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>Next</button>
        </div>
      </div>
    </div>
  );
}
