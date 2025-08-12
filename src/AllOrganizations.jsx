import React from "react";

/* ===== API helpers (samma bas som i dashboard.jsx) ===== */
const API = "https://easyfreightbooking-api.onrender.com";
const getToken = () => localStorage.getItem("jwt") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: "Bearer " + getToken(),
});
async function getJSON(url, init = {}) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(typeof data === "string" ? data : data?.error || `HTTP ${res.status}`);
  return data;
}

/* ====== Row editor ====== */
function OrgRowEditor({ initial, onCancel, onSaved }) {
  const [v, setV] = React.useState(
    initial || {
      company_name: "",
      vat_number: "",
      address: "",
      postal_code: "",
      country_code: "SE",
      invoice_email: "",
      payment_terms_days: 10,
      currency: "EUR",
    }
  );
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");
  const isNew = !initial?.id;

  const save = async () => {
    setErr("");
    setSaving(true);
    try {
      const url = isNew
        ? `${API}/admin/organizations`
        : `${API}/admin/organizations/${initial.id}`;
      const method = isNew ? "POST" : "PUT";
      const body = JSON.stringify(v);
      const data = await getJSON(url, { method, headers: authHeaders(), body });
      onSaved(data, isNew ? "created" : "updated");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (isNew) return onCancel();
    if (!confirm("Delete this organization?\n\nOBS! Blockeras om det finns bookings.")) return;
    try {
      await getJSON(`${API}/admin/organizations/${initial.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      onSaved(null, "deleted");
    } catch (e) {
      // Testa force om användaren vill
      if (String(e.message).includes("cannot delete") || String(e.message).includes("users")) {
        if (confirm("Delete blocked (users or bookings). Try FORCE delete users/addresses?")) {
          await getJSON(`${API}/admin/organizations/${initial.id}?force=1`, {
            method: "DELETE",
            headers: authHeaders(),
          });
          onSaved(null, "deleted");
          return;
        }
      }
      alert(e.message);
    }
  };

  const I = (p) => (
    <input
      className="w-full border rounded p-2"
      value={v[p] ?? ""}
      onChange={(e) => setV((x) => ({ ...x, [p]: e.target.value }))}
    />
  );

  return (
    <tr className="bg-white">
      <td className="px-3 py-2">{I("company_name")}</td>
      <td className="px-3 py-2">{I("vat_number")}</td>
      <td className="px-3 py-2">{I("address")}</td>
      <td className="px-3 py-2 w-36">{I("postal_code")}</td>
      <td className="px-3 py-2 w-24">{I("country_code")}</td>
      <td className="px-3 py-2">{I("invoice_email")}</td>
      <td className="px-3 py-2 w-24">
        <input
          className="w-full border rounded p-2"
          type="number"
          value={v.payment_terms_days ?? ""}
          onChange={(e) =>
            setV((x) => ({ ...x, payment_terms_days: Number(e.target.value || 0) }))
          }
        />
      </td>
      <td className="px-3 py-2 w-24">{I("currency")}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onCancel} className="px-3 py-1.5 rounded border">
            Cancel
          </button>
          {!isNew && (
            <button onClick={del} className="px-3 py-1.5 rounded border text-red-600 hover:text-red-500">
              Delete
            </button>
          )}
        </div>
        {err && <div className="text-red-600 text-xs mt-1">{err}</div>}
      </td>
    </tr>
  );
}

/* ====== Page ====== */
export default function AllOrganizations() {
  const [items, setItems] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [editingId, setEditingId] = React.useState(null);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getJSON(
        `${API}/admin/organizations?search=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`,
        { headers: authHeaders() }
      );
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(String(e.message || e));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, page, pageSize]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onSaved = (payload, op) => {
    setCreating(false);
    setEditingId(null);
    load();
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">All Organizations</h1>
      <div className="text-gray-600 mb-3">Search, edit, create and delete organizations.</div>

      <div className="flex items-center gap-3 mb-3">
        <input
          className="w-[560px] border rounded p-2"
          placeholder="Global search (name, VAT, email)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="border rounded p-2"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}/page
            </option>
          ))}
        </select>
        <button
          onClick={() => setCreating(true)}
          className="ml-auto px-5 py-2 rounded bg-green-600 text-white hover:bg-green-700"
        >
          New organization
        </button>
      </div>

      {error && (
        <div className="mb-3 text-red-600">
          <span className="font-semibold">✗</span> {error}
        </div>
      )}

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">VAT</th>
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2">Postal</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Invoice email</th>
              <th className="px-3 py-2">Terms</th>
              <th className="px-3 py-2">Currency</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {creating && (
              <OrgRowEditor initial={null} onCancel={() => setCreating(false)} onSaved={onSaved} />
            )}
            {items.map((o) =>
              editingId === o.id ? (
                <OrgRowEditor key={o.id} initial={o} onCancel={() => setEditingId(null)} onSaved={onSaved} />
              ) : (
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{o.company_name}</td>
                  <td className="px-3 py-2">{o.vat_number}</td>
                  <td className="px-3 py-2">{o.address}</td>
                  <td className="px-3 py-2">{o.postal_code}</td>
                  <td className="px-3 py-2">{o.country_code}</td>
                  <td className="px-3 py-2">{o.invoice_email}</td>
                  <td className="px-3 py-2">{o.payment_terms_days}</td>
                  <td className="px-3 py-2">{o.currency}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      onClick={() => setEditingId(o.id)}
                      className="px-3 py-1.5 rounded border hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              )
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={9}>
                  No organizations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <div>Total: {total}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded border disabled:opacity-60"
          >
            Prev
          </button>
          <div>
            Page {page} / {pages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-3 py-1.5 rounded border disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
