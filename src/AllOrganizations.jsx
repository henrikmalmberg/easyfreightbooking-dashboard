import { useState, useEffect, useCallback } from "react";

/** -------------------------------------------------------
 *  Config & helpers
 * ------------------------------------------------------*/
const API = "https://easyfreightbooking-api.onrender.com";

const getToken = () => localStorage.getItem("jwt") || "";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: "Bearer " + getToken(),
});

/** Fetch helper som:
 *  - loggar URL, status och text vid fel
 *  - försöker parse:a JSON, annars returnerar text
 */
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
  const ct = res.headers.get("content-type") || "";
  const bodyText = await res.text();
  let data = null;
  try {
    data = ct.includes("application/json") ? JSON.parse(bodyText) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    console.error("API ERROR", {
      url,
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      bodySnippet: bodyText.slice(0, 400),
    });
    const msg = data?.error || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data ?? bodyText;
}

/** Små UI-bitar */
function Badge({ children, className = "" }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 ${className}`}>
      {children}
    </span>
  );
}

function TextInput({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input {...props} className={`mt-1 w-full border rounded p-2 ${props.className || ""}`} />
    </label>
  );
}

/** -------------------------------------------------------
 *  Editor-modal för create/update
 * ------------------------------------------------------*/
function OrgEditor({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(
    initial || {
      company_name: "",
      vat_number: "",
      address: "",
      postal_code: "",
      country_code: "",
      invoice_email: "",
      payment_terms_days: 10,
      currency: "EUR",
    }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  if (!open) return null;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e2) {
      setErr(String(e2.message || e2));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md w-[720px] max-w-[95vw]">
        <div className="px-5 py-3 border-b font-semibold">
          {form.id ? "Edit organization" : "New organization"}
        </div>
        <form onSubmit={handleSubmit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {err && (
            <div className="md:col-span-2 text-red-600 text-sm whitespace-pre-wrap">{err}</div>
          )}
          <TextInput
            label="Company name"
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            required
          />
          <TextInput
            label="VAT number"
            value={form.vat_number}
            onChange={(e) => set("vat_number", e.target.value)}
            required
          />
          <TextInput
            label="Address"
            value={form.address || ""}
            onChange={(e) => set("address", e.target.value)}
          />
          <TextInput
            label="Invoice email"
            type="email"
            value={form.invoice_email || ""}
            onChange={(e) => set("invoice_email", e.target.value)}
            required
          />
          <TextInput
            label="Postal code"
            value={form.postal_code || ""}
            onChange={(e) => set("postal_code", e.target.value)}
          />
          <TextInput
            label="Country (CC)"
            value={form.country_code || ""}
            onChange={(e) => set("country_code", e.target.value.toUpperCase())}
            placeholder="SE, DE, NO …"
          />
          <TextInput
            label="Payment terms (days)"
            type="number"
            value={form.payment_terms_days ?? ""}
            onChange={(e) => set("payment_terms_days", e.target.value)}
          />
          <TextInput
            label="Currency"
            value={form.currency || "EUR"}
            onChange={(e) => set("currency", e.target.value.toUpperCase())}
          />

          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** -------------------------------------------------------
 *  Huvudlista
 * ------------------------------------------------------*/
export default function AllOrganizations() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const url = `${API}/admin/organizations?search=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`;
      const data = await fetchJSON(url);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, pageSize]);

  function openCreate() {
    setEditRow(null);
    setEditorOpen(true);
  }
  function openEdit(row) {
    setEditRow(row);
    setEditorOpen(true);
  }

  async function saveForm(form) {
    if (form.id) {
      // UPDATE
      const url = `${API}/admin/organizations/${form.id}`;
      await fetchJSON(url, { method: "PUT", body: JSON.stringify(form) });
    } else {
      // CREATE
      const url = `${API}/admin/organizations`;
      await fetchJSON(url, { method: "POST", body: JSON.stringify(form) });
    }
    await load();
  }

  async function doDelete(row) {
    if (!window.confirm(`Delete organization "${row.company_name}"?\n\nOBS: blockeras om bookings finns.`)) return;
    try {
      const url = `${API}/admin/organizations/${row.id}`;
      await fetchJSON(url, { method: "DELETE" });
      await load();
    } catch (e) {
      alert("Delete failed: " + String(e.message || e));
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">All Organizations</h1>
      <p className="text-gray-600 mb-4">Search, edit, create and delete organizations.</p>

      <div className="flex items-center gap-3 mb-3">
        <input
          className="flex-1 border rounded p-2"
          placeholder="Global search (name, VAT, email)"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <select
          className="border rounded p-2 w-36"
          value={pageSize}
          onChange={(e) => {
            setPage(1);
            setPageSize(Number(e.target.value));
          }}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}/page
            </option>
          ))}
        </select>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
        >
          New organization
        </button>
      </div>

      {err && (
        <div className="mb-2 text-red-600 text-sm">
          <span className="font-semibold mr-1">✖</span>
          {err}{" "}
          <span className="text-gray-500">
            (se console för detaljer: URL, status och body-snippet)
          </span>
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
            {loading && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                  No organizations
                </td>
              </tr>
            )}
            {items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.company_name}</td>
                <td className="px-3 py-2">{r.vat_number}</td>
                <td className="px-3 py-2">{r.address || "—"}</td>
                <td className="px-3 py-2">{r.postal_code || "—"}</td>
                <td className="px-3 py-2">{r.country_code || "—"}</td>
                <td className="px-3 py-2">{r.invoice_email || "—"}</td>
                <td className="px-3 py-2">
                  <Badge>{(r.payment_terms_days ?? "—") + " d"}</Badge>
                </td>
                <td className="px-3 py-2">{r.currency || "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => openEdit(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => doDelete(r)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <div>Total: {total}</div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded border hover:bg-gray-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            className="px-3 py-1.5 rounded border hover:bg-gray-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <OrgEditor
        open={editorOpen}
        initial={editRow}
        onClose={() => setEditorOpen(false)}
        onSave={saveForm}
      />
    </div>
  );
}
