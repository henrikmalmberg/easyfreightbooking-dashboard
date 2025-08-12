import React from "react";

/** ======= Shared helpers ======= */
const API = "https://easyfreightbooking-api.onrender.com";
const getToken = () => localStorage.getItem("jwt") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: "Bearer " + getToken(),
});


/** ======= Create dialog (inline) ======= */
function CreateOrgDialog({ open, onClose, onCreated }) {
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [form, setForm] = React.useState({
    company_name: "",
    vat_number: "",
    address: "",
    postal_code: "",
    country_code: "",
    invoice_email: "",
    payment_terms_days: 10,
    currency: "EUR",
    admin: { name: "", email: "", password: "" }, // optional
  });

  if (!open) return null;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setAdmin = (k, v) =>
    setForm((p) => ({ ...p, admin: { ...p.admin, [k]: v } }));

  const submit = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${API}/admin/organizations`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      onCreated?.(j);
      onClose();
    } catch (e) {
      setMsg("❌ " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white w-[720px] max-w-[95vw] rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">Create organization</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
        {msg && <div className="mb-2 text-sm">{msg}</div>}

        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded p-2"
                 placeholder="Company name"
                 value={form.company_name}
                 onChange={(e)=>set("company_name", e.target.value)} />
          <input className="border rounded p-2 uppercase"
                 placeholder="VAT (e.g. SE556677889901)"
                 value={form.vat_number}
                 onChange={(e)=>set("vat_number", e.target.value.toUpperCase())} />
          <input className="border rounded p-2 col-span-2"
                 placeholder="Address"
                 value={form.address}
                 onChange={(e)=>set("address", e.target.value)} />
          <input className="border rounded p-2"
                 placeholder="Postal code"
                 value={form.postal_code}
                 onChange={(e)=>set("postal_code", e.target.value)} />
          <input className="border rounded p-2 uppercase"
                 placeholder="Country (CC)"
                 value={form.country_code}
                 onChange={(e)=>set("country_code", e.target.value.toUpperCase())} />
          <input className="border rounded p-2 col-span-2"
                 placeholder="Invoice email"
                 value={form.invoice_email}
                 onChange={(e)=>set("invoice_email", e.target.value)} />
          <input type="number" min="0" max="120"
                 className="border rounded p-2"
                 placeholder="Payment terms (days)"
                 value={form.payment_terms_days}
                 onChange={(e)=>set("payment_terms_days", Number(e.target.value))} />
          <input className="border rounded p-2 uppercase"
                 placeholder="Currency"
                 value={form.currency}
                 onChange={(e)=>set("currency", e.target.value.toUpperCase())} />
        </div>

        <div className="text-sm text-gray-600 mt-4">Optional: initial admin user</div>
        <div className="grid grid-cols-3 gap-3">
          <input className="border rounded p-2" placeholder="Admin name"
                 value={form.admin.name}
                 onChange={(e)=>setAdmin("name", e.target.value)} />
          <input className="border rounded p-2" placeholder="Admin email"
                 value={form.admin.email}
                 onChange={(e)=>setAdmin("email", e.target.value)} />
          <input className="border rounded p-2" placeholder="Admin password"
                 value={form.admin.password}
                 onChange={(e)=>setAdmin("password", e.target.value)} />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-2 border rounded" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                  onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** ======= Main page ======= */
export default function AllOrganizations() {
  const [items, setItems] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [showNew, setShowNew] = React.useState(false);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(
        `${API}/admin/organizations?search=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`,
        { headers: authHeaders() }
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setItems(j.items || []);
      setTotal(j.total || 0);
    } catch (e) {
      setMsg("❌ " + (e.message || e));
    } finally {
      setLoading(false);
    }
  }, [q, page, pageSize]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const onCell = (id, k, v) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  };

  const save = async (row) => {
    setMsg("");
    try {
      const res = await fetch(`${API}/admin/organizations/${row.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          company_name: row.company_name,
          vat_number: row.vat_number,
          address: row.address,
          postal_code: row.postal_code,
          country_code: row.country_code,
          invoice_email: row.invoice_email,
          payment_terms_days: row.payment_terms_days,
          currency: row.currency,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setItems((prev) => prev.map((r) => (r.id === row.id ? j : r)));
      setMsg("✅ Saved");
    } catch (e) {
      setMsg("❌ " + (e.message || e));
    }
  };

  const del = async (id, name) => {
    if (!confirm(`Delete organization "${name}"?\nUsers or bookings may block deletion.`)) return;
    setMsg("");
    try {
      let url = `${API}/admin/organizations/${id}`;
      let res = await fetch(url, { method: "DELETE", headers: authHeaders() });
      let j = await res.json();
      if (res.status === 409 && j?.users > 0) {
        const ok = confirm(`Organization has ${j.users} users.\nDelete users and organization?`);
        if (ok) {
          url = `${API}/admin/organizations/${id}?force=1`;
          res = await fetch(url, { method: "DELETE", headers: authHeaders() });
          j = await res.json();
        }
      }
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      fetchData();
      setMsg("✅ Deleted");
    } catch (e) {
      setMsg("❌ " + (e.message || e));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold">All Organizations</h1>
          <p className="text-sm text-gray-600">Search, edit, create and delete organizations.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-2 w-80"
            placeholder="Global search (name, VAT, email)"
            value={q}
            onChange={(e)=>{ setQ(e.target.value); setPage(1); }}
          />
          <select className="border rounded px-2 py-2"
                  value={pageSize}
                  onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }}>
            {[10,25,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>
          <button className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                  onClick={()=>setShowNew(true)}>
            New organization
          </button>
        </div>
      </div>

      {msg && <div className="mb-2 text-sm">{msg}</div>}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2 w-56">Company</th>
              <th className="px-3 py-2 w-44">VAT</th>
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2 w-28">Postal</th>
              <th className="px-3 py-2 w-24">Country</th>
              <th className="px-3 py-2 w-56">Invoice email</th>
              <th className="px-3 py-2 w-28">Terms</th>
              <th className="px-3 py-2 w-24">Currency</th>
              <th className="px-3 py-2 w-44">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1"
                         value={r.company_name}
                         onChange={(e)=>onCell(r.id, "company_name", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1 uppercase"
                         value={r.vat_number || ""}
                         onChange={(e)=>onCell(r.id, "vat_number", e.target.value.toUpperCase())} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1"
                         value={r.address || ""}
                         onChange={(e)=>onCell(r.id, "address", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1"
                         value={r.postal_code || ""}
                         onChange={(e)=>onCell(r.id, "postal_code", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1 uppercase"
                         value={r.country_code || ""}
                         onChange={(e)=>onCell(r.id, "country_code", e.target.value.toUpperCase())} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1"
                         value={r.invoice_email || ""}
                         onChange={(e)=>onCell(r.id, "invoice_email", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min="0" max="120"
                         className="w-full border rounded px-2 py-1 text-right"
                         value={r.payment_terms_days ?? 0}
                         onChange={(e)=>onCell(r.id, "payment_terms_days", Number(e.target.value))} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1 uppercase"
                         value={r.currency || "EUR"}
                         onChange={(e)=>onCell(r.id, "currency", e.target.value.toUpperCase())} />
                </td>
                <td className="px-3 py-2 space-x-2">
                  <button className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                          onClick={()=>save(r)}>Save</button>
                  <button className="px-3 py-1.5 rounded border text-red-600"
                          onClick={()=>del(r.id, r.company_name)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                  {loading ? "Loading…" : "No organizations"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <div>Total: {total}</div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded"
                  onClick={()=>setPage(p=>Math.max(1,p-1))}
                  disabled={page<=1}>Prev</button>
          <span>Page {page} / {pages}</span>
          <button className="px-2 py-1 border rounded"
                  onClick={()=>setPage(p=>Math.min(pages,p+1))}
                  disabled={page>=pages}>Next</button>
        </div>
      </div>

      <CreateOrgDialog
        open={showNew}
        onClose={()=>setShowNew(false)}
        onCreated={()=>fetchData()}
      />
    </div>
  );
}
