import { useState, useEffect, useCallback } from "react";

/* ===== API helpers ===== */
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

/* ====== Editor row ====== */
function UserRowEditor({ initial, orgOptions, onCancel, onSaved }) {
  const isNew = !initial?.id;
  const [v, setV] = useState(
    initial || {
      organization_id: orgOptions[0]?.id || null,
      name: "",
      email: "",
      password: "", // only used on create
      role: "user",
      is_blocked: false,
    }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    setSaving(true);
    try {
      if (isNew) {
        const body = JSON.stringify({
          org_id: v.organization_id,
          name: v.name,
          email: v.email,
          password: v.password || Math.random().toString(36).slice(2, 10),
          role: v.role,
          is_blocked: v.is_blocked,
        });
        const data = await getJSON(`${API}/admin/users`, {
          method: "POST",
          headers: authHeaders(),
          body,
        });
        onSaved(data, "created");
      } else {
        const body = JSON.stringify({
          email: v.email,
          name: v.name,
          role: v.role,
          is_blocked: v.is_blocked,
          organization_id: v.organization_id,
        });
        const data = await getJSON(`${API}/admin/users/${initial.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body,
        });
        onSaved(data, "updated");
      }
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (isNew) return onCancel();
    if (!confirm("Delete this user?")) return;
    try {
      await getJSON(`${API}/admin/users/${initial.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      onSaved(null, "deleted");
    } catch (e) {
      alert(e.message);
    }
  };

  const reset = async () => {
    if (isNew) return;
    try {
      await getJSON(`${API}/admin/users/${initial.id}/send-reset`, {
        method: "POST",
        headers: authHeaders(),
      });
      alert("Reset email sent");
    } catch (e) {
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
      <td className="px-3 py-2">{I("email")}</td>
      <td className="px-3 py-2">{I("name")}</td>
      <td className="px-3 py-2">
        <select
          className="w-full border rounded p-2"
          value={v.organization_id ?? ""}
          onChange={(e) => setV((x) => ({ ...x, organization_id: Number(e.target.value) }))}
        >
          {orgOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 w-36">
        <select
          className="w-full border rounded p-2"
          value={v.role}
          onChange={(e) => setV((x) => ({ ...x, role: e.target.value }))}
        >
          {["user", "admin", "superadmin"].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 w-24">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!v.is_blocked}
            onChange={(e) => setV((x) => ({ ...x, is_blocked: e.target.checked }))}
          />
          <span>Blocked</span>
        </label>
      </td>
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
            <>
              <button onClick={del} className="px-3 py-1.5 rounded border text-red-600 hover:text-red-500">
                Delete
              </button>
              <button onClick={reset} className="px-3 py-1.5 rounded border">
                Send reset email
              </button>
            </>
          )}
        </div>
        {isNew && (
          <div className="mt-1 text-xs text-gray-500">
            On create: <span className="font-mono">password</span> används om ifyllt (annars autogenereras).
          </div>
        )}
        {isNew && (
          <div className="mt-2">{/* password only when creating */}</div>
        )}
        {isNew && (
          <div className="mt-1">
            <input
              placeholder="Password (optional)"
              className="w-full border rounded p-2"
              type="text"
              value={v.password}
              onChange={(e) => setV((x) => ({ ...x, password: e.target.value }))}
            />
          </div>
        )}
        {err && <div className="text-red-600 text-xs mt-1">{err}</div>}
      </td>
    </tr>
  );
}

/* ====== Page ====== */
export default function AllUsers() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [orgOptions, setOrgOptions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [creating, setCreating] = useState(false);

  // Load organizations for dropdown
  useEffect(() => {
    (async () => {
      try {
        const data = await getJSON(`${API}/organizations`, { headers: authHeaders() });
        setOrgOptions(data || []);
      } catch (e) {
        setOrgOptions([]);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getJSON(
        `${API}/admin/users?search=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`,
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

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = () => {
    setCreating(false);
    setEditingId(null);
    load();
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-[95vw]">
      <h1 className="text-3xl font-bold mb-2">All Users</h1>
      <div className="text-gray-600 mb-3">Search, edit, create and delete users across all organizations.</div>

      <div className="flex items-center gap-3 mb-3">
        <input
          className="w-[720px] border rounded p-2"
          placeholder="Global search (email, name, org)"
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
          New user
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
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Organization</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {creating && (
              <UserRowEditor
                initial={null}
                orgOptions={orgOptions}
                onCancel={() => setCreating(false)}
                onSaved={onSaved}
              />
            )}
            {items.map((u) =>
              editingId === u.id ? (
                <UserRowEditor
                  key={u.id}
                  initial={u}
                  orgOptions={orgOptions}
                  onCancel={() => setEditingId(null)}
                  onSaved={onSaved}
                />
              ) : (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.organization_name || u.organization_id}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded bg-gray-100">{u.role}</span>
                  </td>
                  <td className="px-3 py-2">
                    {u.is_blocked ? (
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800">blocked</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-green-100 text-green-800">active</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      onClick={() => setEditingId(u.id)}
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
                <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                  No users
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
            Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(total / pageSize)), p + 1))}
            disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
            className="px-3 py-1.5 rounded border disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
