import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ========= Reuse your existing helpers =========
const API = "https://easyfreightbooking-api.onrender.com"; // keep in sync with your app
const getToken = () => localStorage.getItem("jwt") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: "Bearer " + getToken(),
});

// ========= API endpoints (adjust if needed) =========
const ENDPOINTS = {
  me: () => `${API}/auth/me`,
  users: ({ page, pageSize, search }) => {
    const p = new URLSearchParams();
    if (page) p.set("page", page);
    if (pageSize) p.set("page_size", pageSize);
    if (search) p.set("search", search);
    return `${API}/admin/users?${p.toString()}`;
  },
  organizations: () => `${API}/organizations`,
  updateUser: (id) => `${API}/admin/users/${id}`,
  sendReset: (id) => `${API}/admin/users/${id}/send-reset`,
};

// ========= Small utilities =========
const ROLES = ["user", "admin"]; // superadmin should generally be controlled outside normal edits
function classNames(...xs) { return xs.filter(Boolean).join(" "); }

export default function AllUsers() {
  const navigate = useNavigate();

  // Access control — require superadmin
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [meErr, setMeErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(ENDPOINTS.me(), { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMe(data);
        if (data?.role !== "superadmin") navigate("/", { replace: true });
      } catch (e) {
        setMeErr(String(e.message || e));
      } finally {
        setLoadingMe(false);
      }
    })();
  }, [navigate]);

  // Table state
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters/search
  const [filters, setFilters] = useState({ email: "", name: "", organization: "", role: "", status: "" });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  // Editing state per row
  const [editRow, setEditRow] = useState(null); // id
  const [draft, setDraft] = useState({});
  const [busyRow, setBusyRow] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load organizations once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(ENDPOINTS.organizations(), { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setOrgs(data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Load users when page/search changes
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const url = ENDPOINTS.users({ page, pageSize, search: debouncedSearch });
        const res = await fetch(url, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        // Support both `{items,total}` or raw array
        if (Array.isArray(data)) {
          setUsers(data);
          setTotal(data.length);
        } else {
          setUsers(data.items || []);
          setTotal(data.total || 0);
        }
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [page, pageSize, debouncedSearch]);

  // Client-side column filtering (on top of server search)
  const filtered = useMemo(() => {
    return users.filter(u => {
      const f = filters;
      const orgName = u.organization_name || orgs.find(o => o.id === u.organization_id)?.name || "";
      const status = u.is_blocked ? "blocked" : "active";
      return (
        (f.email ? (u.email || "").toLowerCase().includes(f.email.toLowerCase()) : true) &&
        (f.name ? (u.name || "").toLowerCase().includes(f.name.toLowerCase()) : true) &&
        (f.organization ? orgName.toLowerCase().includes(f.organization.toLowerCase()) : true) &&
        (f.role ? (u.role || "").toLowerCase().includes(f.role.toLowerCase()) : true) &&
        (f.status ? status.includes(f.status.toLowerCase()) : true)
      );
    });
  }, [users, filters, orgs]);

  function beginEdit(u) {
    setEditRow(u.id);
    setDraft({
      email: u.email || "",
      name: u.name || "",
      role: ROLES.includes(u.role) ? u.role : "user",
      organization_id: u.organization_id || null,
      is_blocked: !!u.is_blocked,
    });
  }
  function cancelEdit() {
    setEditRow(null);
    setDraft({});
  }
  function patchDraft(key, value) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  async function saveRow(u) {
    setBusyRow(u.id);
    try {
      // Guardrails: prevent editing other superadmins; prevent self-demote
      if (u.role === "superadmin" && me?.id !== u.id) {
        throw new Error("You cannot edit another superadmin.");
      }
      if (me?.id === u.id && draft.role && draft.role !== "superadmin") {
        throw new Error("You cannot demote your own account.");
      }

      const res = await fetch(ENDPOINTS.updateUser(u.id), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // Update list
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, ...data } : x)));
      cancelEdit();
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setBusyRow(null);
    }
  }

  async function toggleBlocked(u) {
    setBusyRow(u.id);
    try {
      const res = await fetch(ENDPOINTS.updateUser(u.id), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ is_blocked: !u.is_blocked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, ...data } : x)));
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setBusyRow(null);
    }
  }

  async function sendReset(u) {
    setBusyRow(u.id);
    try {
      const res = await fetch(ENDPOINTS.sendReset(u.id), { method: "POST", headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      alert(`Reset email sent to ${u.email}.`);
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setBusyRow(null);
    }
  }

  if (loadingMe) {
    return <div className="p-6 text-sm text-gray-500">Checking access…</div>;
  }
  if (meErr) {
    return <div className="p-6 text-red-600">{meErr}</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">All Users</h1>
          <p className="text-sm text-gray-500">Search, edit, and manage users across all organizations.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Global search (email, name, org)"
            className="border rounded-xl px-3 py-2 text-sm w-64"
          />
          <select value={pageSize} onChange={(e)=>setPageSize(parseInt(e.target.value)||25)} className="border rounded-xl px-2 py-2 text-sm">
            {[10,25,50,100].map(n=> <option key={n} value={n}>{n}/page</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-3 w-40">Email<br/>
                <input className="mt-1 w-full border rounded px-2 py-1" value={filters.email} onChange={(e)=>setFilters(f=>({...f,email:e.target.value}))} placeholder="filter…"/>
              </th>
              <th className="p-3 w-40">Name<br/>
                <input className="mt-1 w-full border rounded px-2 py-1" value={filters.name} onChange={(e)=>setFilters(f=>({...f,name:e.target.value}))} placeholder="filter…"/>
              </th>
              <th className="p-3 w-56">Organization<br/>
                <input className="mt-1 w-full border rounded px-2 py-1" value={filters.organization} onChange={(e)=>setFilters(f=>({...f,organization:e.target.value}))} placeholder="filter…"/>
              </th>
              <th className="p-3 w-32">Role<br/>
                <input className="mt-1 w-full border rounded px-2 py-1" value={filters.role} onChange={(e)=>setFilters(f=>({...f,role:e.target.value}))} placeholder="user/admin"/>
              </th>
              <th className="p-3 w-28">Status<br/>
                <input className="mt-1 w-full border rounded px-2 py-1" value={filters.status} onChange={(e)=>setFilters(f=>({...f,status:e.target.value}))} placeholder="active/blocked"/>
              </th>
              <th className="p-3 w-64">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="p-4 text-gray-500" colSpan={6}>Loading users…</td></tr>
            )}
            {error && (
              <tr><td className="p-4 text-red-600" colSpan={6}>{error}</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td className="p-4 text-gray-500" colSpan={6}>No users found.</td></tr>
            )}
            {!loading && filtered.map(u => {
              const isEditing = editRow === u.id;
              const orgName = u.organization_name || orgs.find(o => o.id === u.organization_id)?.name || "";
              const isBusy = busyRow === u.id;
              return (
                <tr key={u.id} className="border-t">
                  {/* Email */}
                  <td className="p-3 align-middle">
                    {isEditing ? (
                      <input className="w-full border rounded px-2 py-1" value={draft.email} onChange={e=>patchDraft("email", e.target.value)} />
                    ) : (
                      <span className="font-medium">{u.email}</span>
                    )}
                  </td>

                  {/* Name */}
                  <td className="p-3 align-middle">
                    {isEditing ? (
                      <input className="w-full border rounded px-2 py-1" value={draft.name} onChange={e=>patchDraft("name", e.target.value)} />
                    ) : (
                      <span>{u.name || "—"}</span>
                    )}
                  </td>

                  {/* Organization */}
                  <td className="p-3 align-middle">
                    {isEditing ? (
                      <select className="w-full border rounded px-2 py-1" value={draft.organization_id ?? ""} onChange={e=>patchDraft("organization_id", e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— Select —</option>
                        {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    ) : (
                      <span>{orgName || "—"}</span>
                    )}
                  </td>

                  {/* Role */}
                  <td className="p-3 align-middle">
                    {isEditing ? (
                      <select className="w-full border rounded px-2 py-1" value={draft.role} onChange={e=>patchDraft("role", e.target.value)}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={classNames(
                        "inline-flex items-center px-2 py-0.5 rounded-full border text-xs",
                        u.role === "admin" ? "border-blue-300" : "border-gray-300"
                      )}>{u.role}</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-3 align-middle">
                    <button disabled={isBusy || (u.role === "superadmin" && me?.id !== u.id)} onClick={()=>toggleBlocked(u)} className={classNames(
                      "px-3 py-1 rounded-xl border text-xs",
                      u.is_blocked ? "border-red-300" : "border-green-300",
                      isBusy && "opacity-60 cursor-wait"
                    )}>
                      {u.is_blocked ? "Blocked" : "Active"}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="p-3 align-middle">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button disabled={isBusy} onClick={()=>saveRow(u)} className="px-3 py-1 rounded-xl bg-black text-white text-xs">Save</button>
                        <button disabled={isBusy} onClick={cancelEdit} className="px-3 py-1 rounded-xl border text-xs">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button disabled={isBusy || (u.role === "superadmin" && me?.id !== u.id)} onClick={()=>beginEdit(u)} className="px-3 py-1 rounded-xl border text-xs">Edit</button>
                        <button disabled={isBusy} onClick={()=>sendReset(u)} className="px-3 py-1 rounded-xl border text-xs">Send reset email</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-500">Total: {total}</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded-xl" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          <span>Page {page}</span>
          <button className="px-3 py-1 border rounded-xl" onClick={()=>setPage(p=>p+1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
