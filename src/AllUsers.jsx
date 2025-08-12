import React from "react";

/** ======= Shared helpers ======= */
const API = "https://easyfreightbooking-api.onrender.com";
const getToken = () => localStorage.getItem("jwt") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: "Bearer " + getToken(),
});

/** ======= Create dialog ======= */
function CreateUserDialog({ open, onClose, onCreated }) {
  const [orgs, setOrgs] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [form, setForm] = React.useState({
    org_id: "",
    name: "",
    email: "",
    password: "",
    role: "user",
    is_blocked: false,
  });

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const r = await fetch(`${API}/admin/organizations?page_size=1000`, {
          headers: authHeaders(),
        });
        const j = await r.json();
        if (r.ok) setOrgs(j.items || []);
      } catch {}
    })();
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${API}/admin/users`, {
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
      <div className="bg-white w-[560px] max-w-[95vw] rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">Create user</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
        {msg && <div className="mb-2 text-sm">{msg}</div>}

        <select className="border rounded p-2 w-full mb-2"
                value={form.org_id}
                onChange={(e)=>setForm(p=>({...p, org_id: e.target.value}))}>
          <option value="">Select organization…</option>
          {orgs.map((o)=>(
            <option key={o.id} value={o.id}>{o.company_name}</option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded p-2" placeholder="Name"
                 value={form.name}
                 onChange={(e)=>setForm(p=>({...p, name: e.target.value}))} />
          <input className="border rounded p-2" placeholder="Email"
                 value={form.email}
                 onChange={(e)=>setForm(p=>({...p, email: e.target.value}))} />
          <input className="border rounded p-2" placeholder="Temporary password"
                 value={form.password}
                 onChange={(e)=>setForm(p=>({...p, password: e.target.value}))} />
          <select className="border rounded p-2"
                  value={form.role}
                  onChange={(e)=>setForm(p=>({...p, role: e.target.value}))}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <label className="flex items-center gap-2 text-sm col-span-2">
            <input type="checkbox"
                   checked={form.is_blocked}
                   onChange={(e)=>setForm(p=>({...p, is_blocked: e.target.checked}))}/>
            Blocked
          </label>
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
export default function AllUsers() {
  const [items, setItems] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [filters, setFilters] = React.useState({ email: "", name: "", organization: "", role: "", status: "" });
  const [showNew, setShowNew] = React.useState(false);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(
        `${API}/admin/users?search=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`,
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
      const res = await fetch(`${API}/admin/users/${row.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          email: row.email,
          name: row.name,
          role: row.role,
          organization_id: row.organization_id,
          is_blocked: row.is_blocked,
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

  const sendReset = async (id) => {
    setMsg("");
    try {
      const res = await fetch(`${API}/admin/users/${id}/send-reset`, {
        method: "POST",
        headers: authHeaders(),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setMsg("✅ Password reset email sent");
    } catch (e) {
      setMsg("❌ " + (e.message || e));
    }
  };

  const del = async (row) => {
    if (!confirm(`Delete user ${row.email}?`)) return;
    setMsg("");
    try {
      const res = await fetch(`${API}/admin/users/${row.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      fetchData();
      setMsg("✅ User deleted");
    } catch (e) {
      setMsg("❌ " + (e.message || e));
    }
  };

  const like = (v, q) =>
    String(v ?? "").toLowerCase().includes(String(q ?? "").toLowerCase());

  const filtered = items.filter((r) => {
    if (filters.email && !like(r.email, filters.email)) return false;
    if (filters.name && !like(r.name, filters.name)) return false;
    if (filters.organization && !like(r.organization_name, filters.organization)) return false;
    if (filters.role && r.role !== filters.role) return false;
    if (filters.status) {
      const st = r.is_blocked ? "blocked" : "active";
      if (st !== filters.status) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold">All Users</h1>
          <p className="text-sm text-gray-600">Search, edit, create, reset password and delete users across all organizations.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-2 w-80"
            placeholder="Global search (email, name, org)"
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
            New user
          </button>
        </div>
      </div>

      {msg && <div className="mb-2 text-sm">{msg}</div>}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2 w-64">Email</th>
              <th className="px-3 py-2 w-48">Name</th>
              <th className="px-3 py-2 w-56">Organization</th>
              <th className="px-3 py-2 w-36">Role</th>
              <th className="px-3 py-2 w-36">Status</th>
              <th className="px-3 py-2 w-64">Actions</th>
            </tr>
            <tr className="text-left border-t bg-white">
              <th className="px-3 py-1">
                <input className="w-full border rounded p-1"
                       placeholder="filter…"
                       value={filters.email}
                       onChange={(e)=>setFilters({...filters, email: e.target.value})}/>
              </th>
              <th className="px-3 py-1">
                <input className="w-full border rounded p-1"
                       placeholder="filter…"
                       value={filters.name}
                       onChange={(e)=>setFilters({...filters, name: e.target.value})}/>
              </th>
              <th className="px-3 py-1">
                <input className="w-full border rounded p-1"
                       placeholder="filter…"
                       value={filters.organization}
                       onChange={(e)=>setFilters({...filters, organization: e.target.value})}/>
              </th>
              <th className="px-3 py-1">
                <select className="w-full border rounded p-1"
                        value={filters.role}
                        onChange={(e)=>setFilters({...filters, role: e.target.value})}>
                  <option value="">user/admin</option>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="superadmin">superadmin</option>
                </select>
              </th>
              <th className="px-3 py-1">
                <select className="w-full border rounded p-1"
                        value={filters.status}
                        onChange={(e)=>setFilters({...filters, status: e.target.value})}>
                  <option value="">active/blocked</option>
                  <option value="active">active</option>
                  <option value="blocked">blocked</option>
                </select>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1"
                         value={r.email}
                         onChange={(e)=>onCell(r.id, "email", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full border rounded px-2 py-1"
                         value={r.name || ""}
                         onChange={(e)=>onCell(r.id, "name", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  {/* Organization editable by id; show name for ref */}
                  <div className="flex items-center gap-2">
                    <input className="w-24 border rounded px-2 py-1"
                           title="Organization ID"
                           value={r.organization_id ?? ""}
                           onChange={(e)=>onCell(r.id, "organization_id", Number(e.target.value) || null)} />
                    <span className="text-gray-500 truncate" title={r.organization_name}>
                      {r.organization_name || "—"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <select className="w-full border rounded px-2 py-1"
                          value={r.role}
                          onChange={(e)=>onCell(r.id, "role", e.target.value)}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="superadmin">superadmin</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox"
                           checked={!!r.is_blocked}
                           onChange={(e)=>onCell(r.id, "is_blocked", e.target.checked)} />
                    {r.is_blocked ? (
                      <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-800">Blocked</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">Active</span>
                    )}
                  </label>
                </td>
                <td className="px-3 py-2 space-x-2">
                  <button className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                          onClick={()=>save(r)}>Save</button>
                  <button className="px-3 py-1.5 rounded border"
                          onClick={()=>sendReset(r.id)}>Send reset email</button>
                  <button className="px-3 py-1.5 rounded border text-red-600"
                          onClick={()=>del(r)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  {loading ? "Loading…" : "No users"}
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

      <CreateUserDialog
        open={showNew}
        onClose={()=>setShowNew(false)}
        onCreated={()=>fetchData()}
      />
    </div>
  );
}
