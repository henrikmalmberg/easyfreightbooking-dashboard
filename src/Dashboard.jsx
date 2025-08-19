import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate,
} from "react-router-dom";
import BookingForm from "./BookingForm";
import AllUsers from "./AllUsers";
import AllOrganizations from "./AllOrganizations";
import FAQ from "./FAQ";

// Valfri liten startsida (named export)
function DashboardHome() {
  return <div>App up ✅</div>;
}

/* =========================================================
   App + Routes
========================================================= */



/* =========================================================
   API + Auth helpers
========================================================= */
const API = "https://easyfreightbooking-api.onrender.com";

const getToken   = () => localStorage.getItem("jwt") || "";
const setToken   = (t) => localStorage.setItem("jwt", t);
const clearToken = () => localStorage.removeItem("jwt");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: "Bearer " + getToken(),
});

async function authedGet(path) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

function ProtectedRoute({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

// api helpers (samma API-basadress som idag)
async function authedFetch(path, opts={}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type":"application/json", Authorization:`Bearer ${getToken()}`, ...(opts.headers||{}) }
  });
  const txt = await res.text();
  let body = null; try { body = txt ? JSON.parse(txt) : null; } catch {}
  if (!res.ok) throw new Error(body?.error || txt || `HTTP ${res.status}`);
  return body;
}

// === Download CMR (PDF) button ===
function DownloadCMRButton({ bookingId, bookingNumber }) {
  const [loading, setLoading] = useState(false);

  const openInNewTab = () => {
    const url = `${API}/bookings/${bookingId}/cmr.pdf?jwt=${encodeURIComponent(getToken())}`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    return !!win;
  };

  const fetchAndDownload = async () => {
    const res = await fetch(`${API}/bookings/${bookingId}/cmr.pdf`, {
      method: "GET",
      mode: "cors",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const txt = await res.text();
      const clean = txt.replace(/<[^>]+>/g, "").trim(); // ta bort ev. HTML
      throw new Error(`HTTP ${res.status}: ${clean || "error"}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CMR_${bookingNumber || bookingId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleClick = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      // 1) Försök öppna i ny flik (bypass CORS)
      const opened = openInNewTab();

      // 2) Om popup blockeras → fallback till fetch + nedladdning
      if (!opened) {
        await fetchAndDownload();
      }
    } catch (err) {
      console.error("CMR download failed:", err);
      alert(`Kunde inte hämta CMR-PDF.\n${err?.message || "Okänt fel"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || !bookingId}
      title="Ladda ner CMR-fraktsedel (PDF)"
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:opacity-60"
    >
      <span role="img" aria-label="cmr">📄</span>
      {loading ? "Genererar…" : "CMR"}
    </button>
  );
}



/* =========================================================
   Shared constants/utilities
========================================================= */
const COUNTRIES = [
  { code: "SE", name: "Sweden" }, { code: "DK", name: "Denmark" }, { code: "NO", name: "Norway" },
  { code: "FI", name: "Finland" }, { code: "DE", name: "Germany" }, { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" }, { code: "BE", name: "Belgium" }, { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" }, { code: "PT", name: "Portugal" }, { code: "AT", name: "Austria" },
  { code: "PL", name: "Poland" }, { code: "CZ", name: "Czech Republic" }, { code: "SK", name: "Slovakia" },
  { code: "HU", name: "Hungary" }, { code: "RO", name: "Romania" }, { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" }, { code: "SI", name: "Slovenia" }, { code: "GR", name: "Greece" },
  { code: "IE", name: "Ireland" }, { code: "EE", name: "Estonia" }, { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" },
  { code: "GB", name: "United Kingdom" }, { code: "CH", name: "Switzerland" },
  { code: "UA", name: "Ukraine" }
];

const formatIntSE = (n) =>
  Number.isFinite(Number(n)) ? Math.round(Number(n)).toLocaleString("sv-SE") : "";

const BOOKING_REGEX = /^[A-HJ-NP-TV-Z]{2}-[A-HJ-NP-TV-Z]{3}-\d{5}$/i;

async function getCoordinates(postal, country) {
  const apiKey = "AIzaSyBwOgpWgeY6e4SPNiB1nc_jKKqlN_Yn6YI";
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${postal}&components=country:${country}&key=${apiKey}`
  );
  const data = await response.json();
  if (data.status !== "OK" || !data.results.length) return null;

  const result = data.results[0];
  const countryComponent = result.address_components.find((c) => c.types.includes("country"));
  const countryCode = countryComponent?.short_name?.toUpperCase();
  if (!countryCode || countryCode !== country.toUpperCase()) return null;

  const location = result.geometry.location;
  const locality =
    result.address_components.find((c) => c.types.includes("locality")) ||
    result.address_components.find((c) => c.types.includes("postal_town")) ||
    result.address_components.find((c) => c.types.includes("administrative_area_level_2"));

  return {
    coordinate: [location.lat, location.lng],
    city: locality ? locality.long_name : null,
  };
}

function useCityLookup(postal, country) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let active = true;
    if (postal.length >= 2 && country) {
      getCoordinates(postal, country).then((res) => {
        if (!active) return;
        if (res?.city && res?.coordinate) setData({ city: res.city, coordinate: res.coordinate, country });
        else setData(null);
      });
    } else {
      setData(null);
    }
    return () => { active = false; };
  }, [postal, country]);
  return data;
}

/* =========================================================
   App + Routes
========================================================= */
export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create-account" element={<CreateAccountPage />} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
          <Route path="/new-booking" element={<ProtectedRoute><NewBooking /></ProtectedRoute>} />
          <Route path="/confirm" element={<ProtectedRoute><BookingForm /></ProtectedRoute>} />
          <Route path="/view-bookings" element={<ProtectedRoute><ViewBookings /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />
          <Route path="/all-users" element={<ProtectedRoute><AllUsers /></ProtectedRoute>} />
          <Route path="/admin/organizations" element={<ProtectedRoute><AllOrganizations /></ProtectedRoute>} />
          <Route path="/address-book" element={<ProtectedRoute><AddressBook /></ProtectedRoute>} />
          <Route path="/faq" element={<ProtectedRoute><FAQ /></ProtectedRoute>} />
          
          <Route
            path="/admin/pricing"
            element={
              <ProtectedRoute>
                <AdminPricing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute>
                <AdminAllBookings />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={getToken() ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

/* =========================================================
   Layout + Sidebar
========================================================= */
export function Layout({ children }) {
  const [showSidebar, setShowSidebar] = useState(false);
  return (
    <div className="flex min-h-screen bg-gray-100">
      <div
        className={`fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden ${showSidebar ? "block" : "hidden"}`}
        onClick={() => setShowSidebar(false)}
      />
      <Sidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />

      <main className="flex-1 p-4 md:p-8 overflow-auto w-full">
        <button
          className="md:hidden mb-4 text-blue-600"
          onClick={() => setShowSidebar(true)}
        >
          ☰ Menu
        </button>
        <div className="mx-auto w-full max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}

function Sidebar({ visible, onClose }) {
  const nav = useNavigate();
  const authed = !!getToken();
  const [me, setMe] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    if (authed) {
      authedGet("/me").then((d) => alive && setMe(d)).catch((e) => alive && setErr(e.message));
    }
    return () => { alive = false; };
  }, [authed]);

  const handleLogout = () => {
    clearToken();
    nav("/login");
  };

  const isSuperadmin = me?.user?.role === "superadmin";

  return (
    <aside className={`fixed md:relative z-50 md:z-auto transform top-0 left-0 h-full w-64 bg-white border-r p-6 shadow-md transition-transform duration-300 ${visible ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      <Link to={authed ? "/dashboard" : "/login"} onClick={onClose} className="block mb-6">
        <img src="/logo.png" alt="EasyFreightBooking Logo" className="h-18 w-auto" />
      </Link>

      <nav className="space-y-3">
        {authed ? (
          <>
            <Link to="/dashboard" className="block text-blue-600 font-medium hover:text-blue-800" onClick={onClose}>
              Dashboard
            </Link>
            <Link to="/new-booking" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
              New booking
            </Link>
            <Link to="/view-bookings" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
              View bookings
            </Link>
            <Link to="/account" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
              My account
            </Link>
            <Link to="/address-book" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
              Address Book
            </Link>
            <Link to="/faq" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
              FAQ
            </Link>


            {isSuperadmin && (
              <>
                <Link to="/admin/bookings" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
                  Admin: All bookings
                </Link>
                <Link to="/admin/pricing" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
                  Admin: Pricing config
                </Link>
                <Link to="/all-users" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
                  Admin: All users
                </Link>
                <Link to="/admin/organizations" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
                  Admin: All organizations
                </Link>

              </>
            )}

            <hr className="my-4" />
            <button onClick={handleLogout} className="flex items-center text-sm text-gray-500 hover:text-red-500">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="block text-blue-600 font-medium hover:text-blue-800" onClick={onClose}>
              Log in
            </Link>
            <Link to="/create-account" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
              Create account
            </Link>
          </>
        )}
      </nav>

      {authed && (
        <div className="mt-6 pt-4 border-t text-xs text-gray-600 space-y-1">
          {me ? (
            <>
              <div className="truncate">{me.organization.company_name}</div>
              <div className="truncate">{me.organization.vat_number}</div>
              <div className="truncate">{me.user.name}</div>
            </>
          ) : err ? (
            <div className="text-red-500">Auth error</div>
          ) : (
            <>
              <div className="animate-pulse">—</div>
              <div className="animate-pulse">—</div>
              <div className="animate-pulse">—</div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

/* =========================================================
   Public: Login + Create Account
========================================================= */
function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setToken(data.token);
      nav("/dashboard");
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white border rounded p-6">
      <h1 className="text-2xl font-bold mb-4">Log in</h1>
      {err && <div className="text-red-600 mb-2">{err}</div>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded p-2" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        <input className="w-full border rounded p-2" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Log in</button>
      </form>

      <div className="text-sm mt-4">
        No account?{" "}
        <Link to="/create-account" className="text-blue-600">Create an organization</Link>
      </div>
    </div>
  );
}

function AddressBook() {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});   // id -> utkast (lokala ändringar)
  const [saving, setSaving] = useState({});   // id -> true/false
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try { setRows(await authedFetch("/addresses")); setMsg(""); }
    catch (e) { setMsg(`❌ ${e.message}`); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (id) => {
    setDrafts((d) => (d[id] ? d : { ...d, [id]: { ...rows.find(r => r.id === id) } }));
  };

  const onField = (id, key, value) => {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] || {}), [key]: value } }));
  };

  const isDirty = (id) => {
    const r = rows.find((x) => x.id === id);
    const d = drafts[id];
    if (!r || !d) return false;
    return Object.keys(d).some((k) => (d[k] ?? "") !== (r[k] ?? ""));
  };

  async function saveRow(id) {
    if (!isDirty(id)) return;
    setSaving((s) => ({ ...s, [id]: true }));
    setMsg("");
    try {
      const r = rows.find((x) => x.id === id);
      const d = drafts[id];
      // skapa minimal patch
      const patch = {};
      Object.keys(d).forEach((k) => {
        const v = d[k];
        if ((v ?? "") !== (r[k] ?? "")) patch[k] = v;
      });
      // normalisering
      if (patch.country_code) patch.country_code = patch.country_code.toUpperCase().replace("UK", "GB");
      const updated = await authedFetch(`/addresses/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      // uppdatera i listan
      setRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated } : x)));
      // rensa draft
      setDrafts((d) => {
        const { [id]: _omit, ...rest } = d;
        return rest;
      });
      setMsg("✅ Saved");
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  }

  function revertRow(id) {
    setDrafts((d) => {
      const { [id]: _omit, ...rest } = d;
      return rest;
    });
  }

  async function createRow() {
    setMsg("");
    try {
      const blank = {
        label: "", business_name: "", address: "", address2: "",
        city: "", country_code: "", postal_code: "",
        contact_name: "", phone: "", email: "",
        opening_hours: "", instructions: ""
      };
      const created = await authedFetch("/addresses", {
        method: "POST",
        body: JSON.stringify(blank),
      });
      setRows((prev) => [...prev, created]);
      // öppna i edit mode direkt
      setDrafts((d) => ({ ...d, [created.id]: { ...created } }));
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    }
  }

  async function removeRow(id) {
    if (!window.confirm("Delete this address?")) return;
    setMsg("");
    try {
      await authedFetch(`/addresses/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => r.id !== id));
      revertRow(id);
    } catch (e) { setMsg(`❌ ${e.message}`); }
  }

  const V = (r, key) => (drafts[r.id]?.[key] ?? r[key] ?? "");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">🏷️ Address Book</h1>
      <div className="mb-2 text-sm text-gray-600">Addresses shared within your organization.</div>
      <div className="mb-3 flex gap-2 items-center">
        <button onClick={createRow} className="px-3 py-1.5 rounded bg-blue-600 text-white">+ New address</button>
        {msg && <div className="text-sm">{msg}</div>}
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-auto">
        <table className="min-w-[1200px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 w-40">Label</th>
              <th className="px-3 py-2 w-48">Business</th>
              <th className="px-3 py-2 w-64">Address</th>
              <th className="px-3 py-2 w-56">Address 2</th>
              <th className="px-3 py-2 w-40">City</th>
              <th className="px-3 py-2 w-16">CC</th>
              <th className="px-3 py-2 w-24">Postal</th>
              <th className="px-3 py-2 w-48">Contact name</th>
              <th className="px-3 py-2 w-40">Phone</th>
              <th className="px-3 py-2 w-56">Email</th>
              <th className="px-3 py-2 w-48">Opening hours</th>
              <th className="px-3 py-2 w-[260px]">Instructions</th>
              <th className="px-3 py-2 w-44 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const dirty = isDirty(r.id);
              return (
                <tr key={r.id} className={`border-t ${dirty ? "bg-amber-50" : ""}`} onFocus={() => startEdit(r.id)}>
                  {[
                    ["label","w-full"],["business_name","w-full"],["address","w-full"],["address2","w-full"],
                    ["city","w-full"],["country_code","w-16"],["postal_code","w-full"],
                    ["contact_name","w-full"],["phone","w-full"],["email","w-full"],
                    ["opening_hours","w-full"],["instructions","w-full textarea"],
                  ].map(([key, w], i) => (
                    <td key={key} className="px-3 py-1 align-top">
                      {key === "instructions" ? (
                        <textarea
                          className={`border rounded p-1 ${w} h-10`}
                          value={V(r,key)}
                          onChange={(e) => onField(r.id, key, e.target.value)}
                        />
                      ) : (
                        <input
                          className={`border rounded p-1 ${w}`}
                          value={V(r,key)}
                          onChange={(e) => onField(r.id, key, e.target.value)}
                          maxLength={key === "country_code" ? 2 : undefined}
                        />
                      )}
                    </td>
                  ))}

                  <td className="px-3 py-1 text-right whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => saveRow(r.id)}
                        disabled={!dirty || saving[r.id]}
                        className={`px-2 py-1 rounded text-white ${dirty ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"}`}
                      >
                        {saving[r.id] ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => revertRow(r.id)}
                        disabled={!dirty}
                        className={`px-2 py-1 rounded border ${dirty ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"}`}
                      >
                        Revert
                      </button>
                      <button
                        onClick={() => removeRow(r.id)}
                        className="px-2 py-1 rounded border hover:bg-gray-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={13} className="px-3 py-6 text-center text-gray-500">No addresses</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}





function CreateAccountPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    vat_number: "",
    company_name: "",
    address: "",
    invoice_email: "",
    postal_code: "",
    country_code: "SE",
    name: "",
    email: "",
    password: "",
  });
  const [msg, setMsg] = useState("");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const normalizeVAT = (v) => (v || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const isVATFormat = (v) => /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(v || "");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    const vat = normalizeVAT(form.vat_number);
    if (!isVATFormat(vat)) {
      setMsg("❌ Please enter a valid VAT number (e.g. SE556677889901).");
      return;
    }

    try {
      const payload = { ...form, vat_number: vat };
      const res = await fetch(`${API}/register-organization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data?.admin) {
          setMsg(`❌ Organization already exists.\nPlease contact the admin: ${data.admin.name} <${data.admin.email}> to get an invite.`);
        } else if (data?.field === "email") {
          setMsg("❌ Email already in use.");
        } else if (data?.field === "vat_number") {
          setMsg(`❌ ${data.error}`);
        } else {
          setMsg(`❌ ${data?.error || `HTTP ${res.status}`}`);
        }
        return;
      }

      setMsg("✅ Organization created. You can now log in.");
      setTimeout(() => nav("/login"), 900);
    } catch (e) {
      setMsg(`❌ ${String(e.message || e)}`);
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white border rounded p-6">
      <h1 className="text-2xl font-bold mb-4">Create organization</h1>
      {msg && <div className="mb-3 whitespace-pre-wrap">{msg}</div>}

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
        <input className="border rounded p-2" name="vat_number" placeholder="VAT number"
               value={form.vat_number} onChange={onChange} required />
        <input className="border rounded p-2" name="company_name" placeholder="Company name"
               value={form.company_name} onChange={onChange} required />
        <input className="border rounded p-2" name="address" placeholder="Address (street, city)"
               value={form.address} onChange={onChange} required />

        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded p-2" name="postal_code" placeholder="Postal code"
                 value={form.postal_code} onChange={onChange} />
          <select className="border rounded p-2" name="country_code"
                  value={form.country_code} onChange={onChange}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>

        <input className="border rounded p-2" name="invoice_email" type="email" placeholder="Invoice email"
               value={form.invoice_email} onChange={onChange} required />

        <hr className="my-2" />
        <div className="font-semibold">Admin user</div>
        <input className="border rounded p-2" name="name" placeholder="Your name"
               value={form.name} onChange={onChange} required />
        <input className="border rounded p-2" name="email" type="email" placeholder="Your email"
               value={form.email} onChange={onChange} required />
        <input className="border rounded p-2" name="password" type="password" placeholder="Password"
               value={form.password} onChange={onChange} required />

        <button className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Create</button>
      </form>
    </div>
  );
}

/* =========================================================
   Protected: Welcome
========================================================= */
function Welcome() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Welcome 👋</h1>
      <p className="text-gray-600">Use the menu to create a booking or view your organisation’s bookings.</p>
    </div>
  );
}

/* =========================================================
   Protected: Split View (list + details)
========================================================= */
function BookingNumberBadge({ value }) {
  if (!value) return null;
  const copy = async (e) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(value); } catch {}
  };
  return (
    <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-gray-100 border text-xs text-gray-700">
      {value}
      <button onClick={copy} className="text-gray-500 hover:text-gray-700" title="Copy booking number">⧉</button>
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value || "—"}</span>
    </div>
  );
}

function DetailCard({ title, value }) {
  return (
    <div className="border rounded p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-1 text-gray-800">{value || "—"}</div>
    </div>
  );
}

function AddressDetails({ a }) {
  if (!a) return <div className="text-gray-500">—</div>;
  const line2 = [a.country_code, a.postal_code].filter(Boolean).join("-");

  return (
    <div className="text-sm text-gray-700 space-y-1">
      {a.business_name && <div className="font-medium">{a.business_name}</div>}
      {a.address && <div>{a.address}</div>}
      {(a.city || line2) && <div>{line2} {a.city}</div>}

      {(a.contact_name || a.phone || a.email) && (
        <div className="pt-1">
          <div className="text-xs uppercase tracking-wide text-gray-500">Contact</div>
          <div>{a.contact_name || "—"}</div>
          {a.phone && <div>{a.phone}</div>}
          {a.email && <div>{a.email}</div>}
        </div>
      )}

      {a.opening_hours && (
        <div className="pt-1">
          <div className="text-xs uppercase tracking-wide text-gray-500">Opening hours</div>
          <div>{a.opening_hours}</div>
        </div>
      )}

      {a.instructions && (
        <div className="pt-1">
          <div className="text-xs uppercase tracking-wide text-gray-500">Instructions</div>
          <div>{a.instructions}</div>
        </div>
      )}
    </div>
  );
}

function BookingsSplitView({ adminMode = false }) {
  const [all, setAll] = useState(null);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState(null);

  const [filters, setFilters] = useState({
    booking_number: "",
    load_place: "",
    unload_place: "",
    weight: "",
    status: "",
    customer: "",
  });

  // superadmin / me
  const [me, setMe] = useState(null);

  // reassign modal state
  const [showReassign, setShowReassign] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [reassignOrgId, setReassignOrgId] = useState("");
  const [reassignMsg, setReassignMsg] = useState("");

  // ===== Helpers =====
  const sum = (arr, get) =>
    Array.isArray(arr) ? arr.reduce((t, x) => t + (Number(get(x)) || 0), 0) : 0;

  const statusColors = {
    NEW: "bg-gray-200 text-gray-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    PICKUP_PLANNED: "bg-amber-100 text-amber-800",
    PICKED_UP: "bg-indigo-100 text-indigo-800",
    IN_TRANSIT: "bg-sky-100 text-sky-800",
    DELIVERY_PLANNED: "bg-teal-100 text-teal-800",
    DELIVERED: "bg-green-100 text-green-800",
    COMPLETED: "bg-emerald-200 text-emerald-900",
    ON_HOLD: "bg-yellow-100 text-yellow-900",
    CANCELLED: "bg-red-100 text-red-800",
    EXCEPTION: "bg-rose-100 text-rose-800",
  };

  const computeChargeableFromGoods = (goods = []) =>
    goods.reduce((tot, g) => {
      const w = Number(g.weight) || 0;
      const l = (Number(g.length) || 0) / 100;
      const wi = (Number(g.width) || 0) / 100;
      const h = (Number(g.height) || 0) / 100;
      const q = Number(g.quantity) || 0;
      const vol = l * wi * h * 335;
      return tot + Math.max(w, vol) * q;
    }, 0);

  // ===== Load data =====
  const loadAll = useCallback(async () => {
    setErr(null);
    try {
      if (adminMode) {
        const who = await authedGet("/me");
        setMe(who?.user || null);
        if (who?.user?.role !== "superadmin") throw new Error("Forbidden");
      } else {
        // user mode – hämta ändå /me för UI-bitar
        authedGet("/me").then((d) => setMe(d?.user || null)).catch(() => {});
      }

      const r = await fetch(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setAll(j);
      setSelected(j?.[0] || null);
    } catch (e) {
      setErr(String(e.message || e));
    }
  }, [adminMode]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadAll();
    })();
    return () => {
      alive = false;
    };
  }, [loadAll]);

  // ===== Rows + filters =====
  const rows = useMemo(() => {
    if (!Array.isArray(all)) return [];
    return all.map((b) => {
      const from = b.sender_address;
      const to = b.receiver_address;
      const loadPlace = from
        ? `${from.country_code || ""}-${from.postal_code || ""} ${from.city || ""}`.trim()
        : "";
      const unloadPlace = to
        ? `${to.country_code || ""}-${to.postal_code || ""} ${to.city || ""}`.trim()
        : "";
      const weight = sum(Array.isArray(b.goods) ? b.goods : [], (g) => g.weight);

      return {
        raw: b,
        booking_number: b.booking_number || "",
        load_place: loadPlace,
        unload_place: unloadPlace,
        weight,
        status: b.status || "NEW",
        customer: adminMode ? (b.organization?.company_name || "") : "",
      };
    });
  }, [all, adminMode]);

  const filtered = useMemo(() => {
    const like = (v, q) =>
      String(v ?? "").toLowerCase().includes(String(q ?? "").toLowerCase());
    return rows.filter((r) => {
      if (filters.booking_number && !like(r.booking_number, filters.booking_number)) return false;
      if (filters.load_place && !like(r.load_place, filters.load_place)) return false;
      if (filters.unload_place && !like(r.unload_place, filters.unload_place)) return false;
      if (filters.weight && !like(r.weight, filters.weight)) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (adminMode && filters.customer && !like(r.customer, filters.customer)) return false;
      return true;
    });
  }, [rows, filters, adminMode]);

  const chargeable =
    typeof selected?.chargeable_weight === "number"
      ? selected.chargeable_weight
      : computeChargeableFromGoods(selected?.goods);

  const copy = async (t) => {
    try {
      await navigator.clipboard.writeText(t);
    } catch {}
  };

  if (adminMode && err === "Forbidden")
    return <div className="text-red-600">403 – Admin only</div>;

  const emptyColSpan = adminMode ? 6 : 5;

  // ===== Reassign: load orgs on open =====
  async function openReassign() {
    setReassignMsg("");
    setReassignOrgId("");
    setShowReassign(true);
    if (!adminMode) return;
    try {
      setOrgLoading(true);
      const r = await authedGet("/organizations");
      setOrgs(Array.isArray(r) ? r : []);
    } catch (e) {
      setReassignMsg(`❌ Could not load organizations: ${String(e.message || e)}`);
    } finally {
      setOrgLoading(false);
    }
  }

async function doReassign() {
  if (!selected?.id || !reassignOrgId) {
    setReassignMsg("Please choose a customer.");
    return;
  }
  setReassignMsg("Working…");

  const payload = { organization_id: Number(reassignOrgId), user_id: null };

  // Prova flera kombinationer så vi klarar både CORS och olika backend-impls
  const attempts = [
    { method: "PATCH", path: `/admin/bookings/${selected.id}/reassign` },
    { method: "POST",  path: `/admin/bookings/${selected.id}/reassign` },
    { method: "PUT",   path: `/admin/bookings/${selected.id}` }, // klassisk update
  ];

  let lastErr = null;
  for (const a of attempts) {
    try {
      const res = await fetch(`${API}${a.path}`, {
        method: a.method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      // Om CORS/preflight fallerar kastar fetch innan vi når hit
      if (res.ok) {
        let j = null; try { j = await res.json(); } catch {}
        setReassignMsg("✅ Booking moved");
        setShowReassign(false);
        await loadAll();
        return;
      }
      // 404/405 → prova nästa variant
      if (res.status === 404 || res.status === 405) {
        lastErr = `${a.method} ${a.path} → HTTP ${res.status}`;
        continue;
      }
      // Annat serverfel – visa och avbryt
      const txt = await res.text();
      throw new Error(`${a.method} ${a.path} → HTTP ${res.status} ${txt || ""}`.trim());
    } catch (e) {
      // TypeError: Failed to fetch (CORS/preflight) eller nätverk → prova nästa
      lastErr = String(e.message || e);
      continue;
    }
  }

  setReassignMsg(`❌ Could not move booking.\n${lastErr || "Unknown error"}`);
}




  return (
    <div className="flex gap-4 h-[calc(100vh-140px)]">
      {/* Vänster: lista (får mer utrymme) */}
      <section className="basis-[62%] xl:basis-[66%] shrink-0 bg-white border rounded-lg shadow-sm flex flex-col overflow-hidden">

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-left">
                <th className="px-3 py-2 w-44">Booking #</th>
                {adminMode && <th className="px-3 py-2 w-56">Customer</th>}
                <th className="px-3 py-2">Load Place</th>
                <th className="px-3 py-2">Unload Place</th>
                <th className="px-3 py-2 w-24">Weight</th>
                <th className="px-3 py-2 w-28">Status</th>
              </tr>

              {/* Filterrad */}
              <tr className="text-left bg-white border-b">
                <th className="px-3 py-1">
                  <input
                    className="w-full border rounded p-1"
                    placeholder="Contains…"
                    value={filters.booking_number}
                    onChange={(e) =>
                      setFilters({ ...filters, booking_number: e.target.value })
                    }
                  />
                </th>
                {adminMode && (
                  <th className="px-3 py-1">
                    <input
                      className="w-full border rounded p-1"
                      placeholder="Contains…"
                      value={filters.customer}
                      onChange={(e) =>
                        setFilters({ ...filters, customer: e.target.value })
                      }
                    />
                  </th>
                )}
                <th className="px-3 py-1">
                  <input
                    className="w-full border rounded p-1"
                    placeholder="Contains…"
                    value={filters.load_place}
                    onChange={(e) =>
                      setFilters({ ...filters, load_place: e.target.value })
                    }
                  />
                </th>
                <th className="px-3 py-1">
                  <input
                    className="w-full border rounded p-1"
                    placeholder="Contains…"
                    value={filters.unload_place}
                    onChange={(e) =>
                      setFilters({ ...filters, unload_place: e.target.value })
                    }
                  />
                </th>
                <th className="px-3 py-1">
                  <input
                    className="w-full border rounded p-1"
                    placeholder="Equals…"
                    value={filters.weight}
                    onChange={(e) =>
                      setFilters({ ...filters, weight: e.target.value })
                    }
                  />
                </th>
                <th className="px-3 py-1">
                  <select
                    className="w-full border rounded p-1"
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                  >
                    <option value="">All</option>
                    {[
                      "NEW","CONFIRMED","PICKUP_PLANNED","PICKED_UP","IN_TRANSIT",
                      "DELIVERY_PLANNED","DELIVERED","COMPLETED","ON_HOLD","CANCELLED","EXCEPTION",
                    ].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => {
                const isSel = selected?.id === r.raw.id;
                return (
                  <tr
                    key={r.raw.id}
                    className={`cursor-pointer h-10 ${isSel ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    onClick={() => setSelected(r.raw)}
                  >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <BookingNumberBadge value={r.booking_number} />
                  </td>


                    {adminMode && (
                      <td className="px-3 py-2 whitespace-nowrap truncate max-w-[220px]">
                        {r.customer}
                      </td>
                    )}

                    <td className="px-3 py-2 whitespace-nowrap truncate max-w-[220px]">
                      {r.load_place}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap truncate max-w-[220px]">
                      {r.unload_place}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {formatIntSE(r.weight)}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColors[r.status] || "bg-gray-100"}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={emptyColSpan} className="px-3 py-6 text-center text-gray-500">
                    No bookings
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Höger: detaljer */}
      <section className="flex-1 overflow-auto">
        {!selected ? (
          <div className="text-gray-500">Select a booking from the list.</div>
        ) : (
          <div className="bg-white border rounded-lg shadow-sm p-4 md:p-6">
           <div className="flex items-start justify-between mb-4 gap-3">
  {/* Vänster: nummer + status */}
  <div className="flex items-center gap-3">
    <span className="text-lg font-semibold">{selected.booking_number}</span>
    <span className={`text-xs px-2 py-0.5 rounded ${statusColors[selected.status] || "bg-gray-100"}`}>
      {selected.status || "NEW"}
    </span>
  </div>

  {/* Höger: info + actions */}
  <div className="flex items-end gap-3">
    {/* Info (datum/pris) */}
    <div className="text-right text-sm text-gray-600">
      <div>
        Booked:{" "}
        {selected.booking_date ||
          (selected.created_at ? new Date(selected.created_at).toLocaleDateString() : "—")}
      </div>
      {typeof selected.price_eur === "number" && (
        <div className="font-medium">{Math.round(selected.price_eur)} EUR</div>
      )}

      {adminMode && me?.role === "superadmin" && (
        <button
          onClick={openReassign}
          className="mt-2 px-3 py-1 text-xs bg-gray-100 border rounded hover:bg-gray-200 w-full"
        >
          Change customer
        </button>
      )}
    </div>

    {/* ✅ CMR-knappen */}
    <DownloadCMRButton
      bookingId={selected.id}
      bookingNumber={selected.booking_number}
    />
  </div>
</div>


            {/* Customer + user */}
            {selected?.organization && (
              <div className="mb-3 text-sm text-gray-600">
                <div>
                  <span className="text-gray-500">Customer:</span>{" "}
                  {selected.organization.company_name || "—"}
                  {selected?.booked_by?.name ? `, ${selected.booked_by.name}` : ""}
                </div>
              </div>
            )}

            {/* Route */}
            <div className="mb-4">
              <div className="text-gray-700 font-medium">
                {selected?.sender_address?.country_code}{" "}
                {selected?.sender_address?.postal_code}{" "}
                {selected?.sender_address?.city}
                {"  →  "}
                {selected?.receiver_address?.country_code}{" "}
                {selected?.receiver_address?.postal_code}{" "}
                {selected?.receiver_address?.city}
              </div>
              <div className="text-xs text-gray-500">
                Mode: {selected.selected_mode?.replaceAll("_", " ") || "—"}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PICKUP */}
              <div className="border rounded p-3">
                <div className="font-semibold mb-2">Pickup</div>
                <AddressDetails a={selected.sender_address} />
                <hr className="my-2" />
                <DetailRow label="Requested" value={`${selected.loading_requested_date || ""} ${selected.loading_requested_time || ""}`.trim()} />
                <DetailRow label="Planned"   value={`${selected.loading_planned_date   || ""} ${selected.loading_planned_time   || ""}`.trim()} />
                <DetailRow label="Actual"    value={`${selected.loading_actual_date    || ""} ${selected.loading_actual_time    || ""}`.trim()} />
              </div>

              {/* DELIVERY */}
              <div className="border rounded p-3">
                <div className="font-semibold mb-2">Delivery</div>
                <AddressDetails a={selected.receiver_address} />
                <hr className="my-2" />
                <DetailRow label="Requested" value={`${selected.unloading_requested_date || ""} ${selected.unloading_requested_time || ""}`.trim()} />
                <DetailRow label="Planned"   value={`${selected.unloading_planned_date   || ""} ${selected.unloading_planned_time   || ""}`.trim()} />
                <DetailRow label="Actual"    value={`${selected.unloading_actual_date    || ""} ${selected.unloading_actual_time    || ""}`.trim()} />
              </div>
            </div>

            {/* Goods */}
            {Array.isArray(selected.goods) && selected.goods.length > 0 && (
              <div className="mt-4">
                <div className="font-semibold mb-2">Goods</div>
                <div className="rounded border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Weight</th>
                        <th className="px-3 py-2 text-right">L×W×H (cm)</th>
                        <th className="px-3 py-2 text-right">LDM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.goods.map((g, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{g.type}</td>
                          <td className="px-3 py-2 text-right">{g.quantity}</td>
                          <td className="px-3 py-2 text-right">{g.weight}</td>
                          <td className="px-3 py-2 text-right">
                            {g.length}×{g.width}×{g.height}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {g.ldm ?? ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="px-3 py-2 bg-gray-50 text-right font-medium">
                          Total chargeable: {Math.round(chargeable)} kg
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* References */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailCard title="Reference 1" value={selected?.references?.reference1} />
              <DetailCard title="Reference 2" value={selected?.references?.reference2} />
            </div>

            {/* CO2 & Transit */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              {selected.co2_emissions && <div>🌍 CO₂: {Number(selected.co2_emissions).toFixed(1)} kg</div>}
              {selected.transit_time_days && <div>Transit time: {selected.transit_time_days}</div>}
            </div>
          </div>
        )}
      </section>

      {/* ===== Reassign Modal ===== */}
      {showReassign && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Change customer</div>
              <button onClick={() => setShowReassign(false)} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              Booking <strong>{selected?.booking_number}</strong>
            </div>

            <label className="block mb-3">
              <span className="text-xs text-gray-500">New customer (organization)</span>
              <select
                className="mt-1 w-full border rounded p-2"
                disabled={orgLoading}
                value={reassignOrgId}
                onChange={(e) => setReassignOrgId(e.target.value)}
              >
                <option value="">— Select —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name || o.company_name || `#${o.id}`}
                  </option>
                ))}
              </select>
            </label>

            {reassignMsg && (
              <div className="mb-3 text-sm whitespace-pre-wrap">
                {reassignMsg}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReassign(false)} className="px-3 py-1.5 rounded border">
                Cancel
              </button>
              <button
                onClick={doReassign}
                disabled={!reassignOrgId}
                className={`px-3 py-1.5 rounded text-white ${reassignOrgId ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}
              >
                Move booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* Wrappers för sidorna */
function ViewBookings() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">📦 View bookings</h1>
      <BookingsSplitView adminMode={false} />
    </div>
  );
}

function AdminAllBookings() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">🛡️ Admin: All bookings</h1>
      <BookingsSplitView adminMode={true} />
    </div>
  );
}

/* =========================================================
   Protected: My Account + Invite colleague
========================================================= */
function MyAccount() {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState(null);
  const [invite, setInvite] = useState({ name: "", email: "", password: "", role: "user" });
  const [inviteMsg, setInviteMsg] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await authedGet("/me", { cache: "no-store" });
        if (!alive) return;
        setMe(m);

        const orgId = m?.organization?.id;
        if (orgId) {
          try {
            const org = await authedGet(`/organizations/${orgId}`);
            if (!alive) return;
            setMe(prev => ({
              ...prev,
              organization: { ...(prev?.organization || {}), ...(org || {}) },
            }));
          } catch {
            // saknar rättighet till /organizations/:id – då nöjer vi oss med /me
          }
        }
      } catch (e) {
        if (!alive) return;
        setErr(String(e.message || e));
      }
    })();
    return () => { alive = false; };
  }, []);

  async function sendInvite(e) {
    e.preventDefault();
    setInviteMsg("");
    try {
      const res = await fetch(`${API}/invite-user`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(invite),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setInviteMsg("✅ Invitation sent!");
      setInvite({ name: "", email: "", password: "", role: "user" });
    } catch (e) {
      setInviteMsg(`❌ ${e.message}`);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold mb-4">My account</h1>
      {err && <div className="text-red-600 mb-2">{String(err)}</div>}
      {me && (
        <div className="mb-8 bg-white rounded border p-4 space-y-1">
          <div><strong>Organization:</strong> {me.organization?.company_name}</div>
          <div><strong>VAT:</strong> {me.organization?.vat_number}</div>
          <div><strong>Address:</strong> {me.organization?.address || "—"}</div>
          <div><strong>Postal code:</strong> {me.organization?.postal_code || "—"}</div>
          <div><strong>Country:</strong> {me.organization?.country_code || "—"}</div>
          <div><strong>Payment terms:</strong> {me.organization?.payment_terms_days} days</div>
          <div><strong>Currency:</strong> {me.organization?.currency}</div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-2">Invite a colleague</h2>
      <form onSubmit={sendInvite} className="bg-white rounded border p-4 space-y-3">
        <input className="w-full border rounded p-2" placeholder="Name" value={invite.name}
               onChange={(e) => setInvite({ ...invite, name: e.target.value })} required />
        <input className="w-full border rounded p-2" placeholder="Email" type="email" value={invite.email}
               onChange={(e) => setInvite({ ...invite, email: e.target.value })} required />
        <input className="w-full border rounded p-2" placeholder="Temporary password" type="text" value={invite.password}
               onChange={(e) => setInvite({ ...invite, password: e.target.value })} required />
        <select className="w-full border rounded p-2" value={invite.role}
                onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">Send invite</button>
        {inviteMsg && <div className="text-sm mt-2">{inviteMsg}</div>}
      </form>
    </div>
  );
}



/* =========================================================
   Protected: New booking (+ ResultCard)
========================================================= */
function ResultCard({ transport, selectedOption, onSelect }) {
  const [showInfo, setShowInfo] = useState(false);
  const icons = {
    road_freight: "🚛",
    express_road: "🚀",
    ocean_freight: "🚢",
    intermodal_rail: "🚚🚆",
    conventional_rail: "🚆",
  };
  const isSelected = selectedOption?.mode === transport.mode;

  return (
    <div
      onClick={() => onSelect(transport)}
      className={`cursor-pointer border rounded-lg p-4 mb-3 bg-white shadow-sm transition ${
        isSelected ? "border-blue-600 bg-blue-50" : "hover:bg-blue-50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-lg font-semibold capitalize relative">
          <input
            type="radio"
            name="selectedTransport"
            checked={isSelected}
            onChange={() => onSelect(transport)}
          />
          <span>{icons[transport.mode]}</span>
          <span>{transport.mode.replace("_", " ")}</span>

          {transport.description && (
            <>
              <span
                className="ml-1 text-gray-400 cursor-pointer hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfo(!showInfo);
                }}
              >
                ⓘ
              </span>
              {showInfo && (
                <div className="absolute top-6 left-0 w-64 p-2 text-sm text-gray-800 bg-white border rounded shadow-md z-10">
                  {transport.description}
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-blue-600 font-bold text-lg">{transport.total_price}</div>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <div><strong>Earliest pickup:</strong> {transport.earliest_pickup}</div>
        <div><strong>Transit time:</strong> {transport.days} days</div>
        {transport.co2 && (
          <div><strong>🌍 CO₂ emissions:</strong> {(transport.co2 / 1000).toFixed(1)} kg</div>
        )}
      </div>
    </div>
  );
}

function AdminPricing() {
  const [me, setMe] = useState(null);
  const [cfgPublished, setCfgPublished] = useState(null);
  const [cfgDraft, setCfgDraft] = useState(null);
  const [working, setWorking] = useState(null);
  const [selectedMode, setSelectedMode] = useState("");
  const [tab, setTab] = useState("general");
  const [msg, setMsg] = useState("");

  // ===== helpers för nya modes =====
  const slugify = (s) =>
    String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/-+/g, "_");

  const uniqueKey = (baseKey, data) => {
    let key = baseKey;
    let i = 1;
    while (key in (data || {})) {
      i += 1;
      key = `${baseKey}_${i}`;
    }
    return key;
  };

  const makeDefaultMode = (label) => ({
    label,
    description: "",
    // Pricing
    km_price_eur: 1.2,
    co2_per_ton_km: 0.045,
    min_allowed_weight_kg: 100,
    max_allowed_weight_kg: 25160,
    max_weight_kg: 25160,
    default_breakpoint: 20000,
    // Curve
    p1: 30,
    price_p1: 50,
    p2: 740,
    p2k: 0.1,
    p2m: 100,
    p3: 1850,
    p3k: 0.12,
    p3m: 120,
    // Transit
    transit_speed_kmpd: 600,
    cutoff_hour: 12,
    extra_pickup_days: 0,
    // Zones & balance – tomma tills du fyller i
    available_zones: {},
    balance_factors: {},
  });

  // UI-state för create-dialog
  const [newOpen, setNewOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");

  useEffect(() => {
    authedGet("/me")
      .then((m) => {
        if (m?.user?.role !== "superadmin") throw new Error("Forbidden");
        setMe(m);
        return authedGet("/admin/config");
      })
      .then((d) => {
        const base = d.draft?.data || d.published?.data || {};
        setCfgPublished(d.published?.data || {});
        setCfgDraft(d.draft?.data || null);
        setWorking(JSON.parse(JSON.stringify(base)));
        const firstMode = Object.keys(base || {})[0] || "";
        setSelectedMode(firstMode);
      })
      .catch((e) => setMsg(`❌ ${String(e.message || e)}`));
  }, []);

  const modes = Object.keys(working || {});

  function setModeField(mode, path, value) {
    setWorking((prev) => {
      const next = { ...prev };
      next[mode] = { ...(next[mode] || {}) };
      next[mode][path] = value;
      return next;
    });
  }

  // ===== text<->obj helpers du redan hade =====
  const parseZones = (text) => {
    const out = {};
    text.split("\n").forEach((line) => {
      const s = line.trim();
      if (!s) return;
      const [cc, ranges] = s.split(":");
      if (!cc || !ranges) return;
      out[cc.trim().toUpperCase()] = ranges.split(",").map((x) => x.trim()).filter(Boolean);
    });
    return out;
  };
  const zonesToText = (z) =>
    !z ? "" : Object.entries(z).map(([cc, arr]) => `${cc}: ${arr.join(", ")}`).join("\n");

  const parseBalance = (text) => {
    const out = {};
    text.split("\n").forEach((line) => {
      const s = line.trim();
      if (!s) return;
      const [k, v] = s.split("=");
      if (!k || !v) return;
      out[k.trim().toUpperCase()] = parseFloat(v);
    });
    return out;
  };
  const balanceToText = (b) =>
    !b ? "" : Object.entries(b).map(([k, v]) => `${k}=${v}`).join("\n");

  // ===== nya actions: create/duplicate/delete =====
  function openNew() {
    setNewLabel("");
    setNewKey("");
    setNewOpen(true);
  }
  function onNewLabelChange(v) {
    setNewLabel(v);
    if (!newKey) setNewKey(slugify(v));
  }
  function onNewKeyChange(v) {
    setNewKey(slugify(v));
  }
  function createMode() {
    const baseKey = slugify(newKey || newLabel || "new_mode");
    const key = uniqueKey(baseKey || "mode", working);
    const def = makeDefaultMode(newLabel || "New mode");
    setWorking((prev) => ({ ...(prev || {}), [key]: def }));
    setSelectedMode(key);
    setNewOpen(false);
    setMsg("✅ Mode created (remember to Save draft)");
  }

  function duplicateMode() {
    if (!selectedMode || !working?.[selectedMode]) return;
    const src = working[selectedMode];
    const lbl = (src.label || selectedMode) + " (copy)";
    const baseKey = slugify(selectedMode + "_copy");
    const key = uniqueKey(baseKey, working);
    const clone = JSON.parse(JSON.stringify(src));
    clone.label = lbl;
    setWorking((prev) => ({ ...(prev || {}), [key]: clone }));
    setSelectedMode(key);
    setMsg("✅ Duplicated (remember to Save draft)");
  }

  function deleteMode() {
    if (!selectedMode) return;
    if (!window.confirm(`Delete mode "${selectedMode}"? This will be removed from the draft config.`)) return;
    setWorking((prev) => {
      const next = { ...(prev || {}) };
      delete next[selectedMode];
      return next;
    });
    // välj första kvarvarande
    const remaining = Object.keys(working || {}).filter((k) => k !== selectedMode);
    setSelectedMode(remaining[0] || "");
    setMsg("🗑️ Removed (remember to Save draft)");
  }

  // ===== draft actions =====
  async function saveDraft() {
    setMsg("");
    try {
      const res = await fetch(`${API}/admin/config/draft`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(working),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.errors?.[0] || j.error || `HTTP ${res.status}`);
      setMsg("✅ Draft saved");
      setCfgDraft(working);
    } catch (e) {
      setMsg(`❌ ${String(e.message || e)}`);
    }
  }
  async function validateDraft() {
    setMsg("");
    try {
      const res = await fetch(`${API}/admin/config/validate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ data: working }),
      });
      const j = await res.json();
      if (!j.ok) setMsg(`⚠️ Validation errors:\n- ${j.errors.join("\n- ")}`);
      else setMsg("✅ Validation OK");
    } catch (e) {
      setMsg(`❌ ${String(e.message || e)}`);
    }
  }
  async function publishNow() {
    setMsg("");
    try {
      const res = await fetch(`${API}/admin/config/publish`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ comment: "Publish from admin UI" }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setMsg(`✅ Published version ${j.version}`);
      setCfgPublished(working);
    } catch (e) {
      setMsg(`❌ ${String(e.message || e)}`);
    }
  }

  if (!working) return <div>Loading…</div>;
  if (!modes.length) return (
    <div className="flex gap-4">
      <aside className="w-72 bg-white border rounded-lg shadow-sm p-3">
        <div className="font-semibold mb-2">Modes</div>
        <button onClick={openNew} className="px-3 py-1.5 rounded bg-blue-600 text-white w-full">+ New mode</button>
        {newOpen && (
          <div className="mt-3 space-y-2">
            <input className="w-full border rounded p-2" placeholder="Label"
                   value={newLabel} onChange={(e)=>onNewLabelChange(e.target.value)} />
            <input className="w-full border rounded p-2" placeholder="Key (slug)"
                   value={newKey} onChange={(e)=>onNewKeyChange(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={createMode} className="px-3 py-1.5 rounded bg-green-600 text-white">Create</button>
              <button onClick={()=>setNewOpen(false)} className="px-3 py-1.5 rounded border">Cancel</button>
            </div>
          </div>
        )}
      </aside>
      <section className="flex-1 bg-white border rounded-lg shadow-sm p-4">
        <div className="text-gray-600">No modes yet – create your first.</div>
      </section>
    </div>
  );

  const m = working[selectedMode] || {};

  const field = (label, key, type="number", step="any") => (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type={type}
        step={step}
        value={m?.[key] ?? ""}
        onChange={(e)=>setModeField(selectedMode, key, type==="number" ? Number(e.target.value) : e.target.value)}
        className="mt-1 w-full border rounded p-2"
      />
    </label>
  );

  return (
    <div className="flex gap-4">
      {/* vänster lista + toolbar */}
      <aside className="w-72 bg-white border rounded-lg shadow-sm overflow-auto">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold">Modes</div>
          <button onClick={openNew} className="text-sm px-2 py-1 rounded bg-blue-600 text-white">+ New</button>
        </div>

        {/* inline create */}
        {newOpen && (
          <div className="px-3 py-2 border-b space-y-2">
            <input className="w-full border rounded p-2" placeholder="Label"
                   value={newLabel} onChange={(e)=>onNewLabelChange(e.target.value)} />
            <input className="w-full border rounded p-2" placeholder="Key (auto from label)"
                   value={newKey} onChange={(e)=>onNewKeyChange(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={createMode} className="px-3 py-1.5 rounded bg-green-600 text-white">Create</button>
              <button onClick={()=>setNewOpen(false)} className="px-3 py-1.5 rounded border">Cancel</button>
            </div>
          </div>
        )}

        <ul>
          {modes.map((k) => {
            const label = working[k]?.label || k;
            const changed = JSON.stringify(cfgPublished?.[k]) !== JSON.stringify(working?.[k]);
            const isSel = selectedMode === k;
            return (
              <li key={k} className={`border-t ${isSel ? "bg-blue-50" : ""}`}>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                  onClick={()=>setSelectedMode(k)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{label}</span>
                    {changed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">DRAFT*</span>}
                  </div>
                  <div className="text-xs text-gray-500">{k}</div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* actions för vald mode */}
        <div className="p-3 border-t flex gap-2">
          <button onClick={duplicateMode} disabled={!selectedMode}
                  className={`px-2 py-1 rounded border ${selectedMode ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"}`}>
            Duplicate
          </button>
          <button onClick={deleteMode} disabled={!selectedMode}
                  className={`px-2 py-1 rounded border ${selectedMode ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"}`}>
            Delete
          </button>
        </div>
      </aside>

      {/* höger formulär */}
      <section className="flex-1 bg-white border rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">{m.label || selectedMode}</div>
          <div className="flex gap-2">
            <button onClick={saveDraft} className="px-3 py-1.5 rounded bg-gray-800 text-white">Save draft</button>
            <button onClick={validateDraft} className="px-3 py-1.5 rounded bg-blue-600 text-white">Validate</button>
            <button onClick={publishNow} className="px-3 py-1.5 rounded bg-green-600 text-white">Publish</button>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-2 mb-4">
          {["general","pricing","transit","zones","balance"].map(t => (
            <button key={t}
              className={`px-3 py-1.5 rounded border ${tab===t ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-transparent"}`}
              onClick={()=>setTab(t)}
            >
              {t[0].toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {tab==="general" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block md:col-span-2">
              <span className="text-xs text-gray-500">Label</span>
              <input className="mt-1 w-full border rounded p-2"
                     value={m?.label ?? ""}
                     onChange={(e)=>setModeField(selectedMode,"label", e.target.value)} />
            </label>
            <label className="md:col-span-2 block">
              <span className="text-xs text-gray-500">Description</span>
              <textarea
                value={m?.description ?? ""}
                onChange={(e)=>setModeField(selectedMode,"description", e.target.value)}
                className="mt-1 w-full border rounded p-2 h-24"
              />
            </label>
            <div className="text-xs text-gray-500 md:col-span-2">Key: <code>{selectedMode}</code> (cannot be changed here)</div>
          </div>
        )}

        {tab==="pricing" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {field("km_price_eur","km_price_eur")}
            {field("co2_per_ton_km","co2_per_ton_km")}
            {field("min_allowed_weight_kg","min_allowed_weight_kg")}
            {field("max_allowed_weight_kg","max_allowed_weight_kg")}
            {field("max_weight_kg","max_weight_kg")}
            {field("default_breakpoint","default_breakpoint")}
            <div className="md:col-span-3 border-t pt-2 text-xs text-gray-500">Curve params</div>
            {field("p1","p1")}
            {field("price_p1","price_p1")}
            {field("p2","p2")}
            {field("p2k","p2k")}
            {field("p2m","p2m")}
            {field("p3","p3")}
            {field("p3k","p3k")}
            {field("p3m","p3m")}
          </div>
        )}

        {tab==="transit" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {field("transit_speed_kmpd","transit_speed_kmpd")}
            {field("cutoff_hour","cutoff_hour")}
            {field("extra_pickup_days","extra_pickup_days")}
          </div>
        )}

        {tab==="zones" && (
          <div>
            <div className="text-xs text-gray-500 mb-1">One per line: CC: ranges… (ex: SE: 20-89, 90)</div>
            <textarea
              className="w-full border rounded p-2 h-48 font-mono text-sm"
              defaultValue={zonesToText(m.available_zones)}
              onBlur={(e)=>setModeField(selectedMode, "available_zones", parseZones(e.target.value))}
            />
            <div className="text-xs text-gray-500 mt-1">Saved on blur</div>
          </div>
        )}

        {tab==="balance" && (
          <div>
            <div className="text-xs text-gray-500 mb-1">One per line: CC-CC=value (ex: SE-DE=1.0)</div>
            <textarea
              className="w-full border rounded p-2 h-48 font-mono text-sm"
              defaultValue={balanceToText(m.balance_factors)}
              onBlur={(e)=>setModeField(selectedMode, "balance_factors", parseBalance(e.target.value))}
            />
            <div className="text-xs text-gray-500 mt-1">Saved on blur</div>
          </div>
        )}

        {/* status */}
        <div className="mt-4 text-sm whitespace-pre-wrap">{msg}</div>

        {/* publicerad version-indikator */}
        <div className="mt-3 text-xs text-gray-600 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          Published version {cfgPublished ? (cfgPublished.__version || "—") : "—"}
        </div>
      </section>
    </div>
  );
}


function NewBooking() {
  const [goods, setGoods] = useState([{ type: "Colli", weight: "", length: "", width: "", height: "", quantity: 1 }]);
  const [form, setForm] = useState({ pickup_country: "SE", pickup_postal: "", delivery_country: "SE", delivery_postal: "" });
  const [result, setResult] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const navigate = useNavigate();

  const [fromPrefill, setFromPrefill] = useState(null);
  const [toPrefill, setToPrefill] = useState(null);

  // === Gemensam adressbok (en lista) ===
  const [addrbook, setAddrbook] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const all = await authedFetch("/addresses");
        setAddrbook(Array.isArray(all) ? all : []);
      } catch {
        // tyst fel – prissökning funkar ändå
      }
    })();
  }, []);

  // Valt alternativ i dropdowns (visar markerat val)
  const [addrSel, setAddrSel] = useState({ from: "", to: "" });

  // Helpers när man väljer adress ur boken
  const pickFromBookFrom = (id) => {
    const a = addrbook.find(x => String(x.id) === String(id));
    if (!a) return;
    setFromPrefill(a);
    setForm(p => ({
      ...p,
      pickup_country: (a.country_code || p.pickup_country || "").toUpperCase().replace("UK", "GB"),
      pickup_postal: (a.postal_code || "").trim(),
    }));
  };

  const pickFromBookTo = (id) => {
    const a = addrbook.find(x => String(x.id) === String(id));
    if (!a) return;
    setToPrefill(a);
    setForm(p => ({
      ...p,
      delivery_country: (a.country_code || p.delivery_country || "").toUpperCase().replace("UK", "GB"),
      delivery_postal: (a.postal_code || "").trim(),
    }));
  };

  const calculateChargeableWeight = (goods) =>
    goods.reduce((total, item) => {
      const weight = parseFloat(item.weight) || 0;
      const length = (parseFloat(item.length) || 0) / 100;
      const width  = (parseFloat(item.width)  || 0) / 100;
      const height = (parseFloat(item.height) || 0) / 100;
      const quantity = parseInt(item.quantity) || 0;
      const volumeWeight = length * width * height * 335;
      const chargeable = Math.max(weight, volumeWeight);
      return total + chargeable * quantity;
    }, 0);

  const chargeableWeight = calculateChargeableWeight(goods);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const cityFrom = useCityLookup(form.pickup_postal, form.pickup_country);
  const cityTo   = useCityLookup(form.delivery_postal, form.delivery_country);

  const handleGoodsChange = (index, e) => {
    const { name, value } = e.target;
    const updated = [...goods];
    updated[index][name] = value;
    if (name === "type") {
      if (value === "FTL") {
        updated[index]["weight"] = "24000";
        updated[index]["length"] = "13.6";
        updated[index]["width"] = "";
        updated[index]["height"] = "";
      } else if (value === "Pallet") {
        updated[index]["length"] = "120";
        updated[index]["width"] = "80";
      } else if (value === "Colli") {
        updated[index]["length"] = "";
        updated[index]["width"] = "";
        updated[index]["height"] = "";
      }
    }
    setGoods(updated);
  };

  const addGoodsRow = () =>
    setGoods([...goods, { type: "Colli", weight: "", length: "", width: "", height: "", quantity: 1 }]);
  const removeGoodsRow = (i) => setGoods(goods.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setResult(null);
    if (!cityFrom?.coordinate || !cityTo?.coordinate) {
      alert("Check postal codes.");
      return;
    }
    const payload = {
      pickup_coordinate: cityFrom.coordinate,
      pickup_country: form.pickup_country,
      pickup_postal_prefix: form.pickup_postal.substring(0, 2),
      delivery_coordinate: cityTo.coordinate,
      delivery_country: form.delivery_country,
      delivery_postal_prefix: form.delivery_postal.substring(0, 2),
      chargeable_weight: Math.round(chargeableWeight),
    };
    try {
      const res = await fetch(`${API}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert(`Could not fetch prices: ${err.message}`);
    }
  };

  const handleSelect = (option) => {
    if (!option) return;
    navigate("/confirm", {
      state: {
        search: {
          pickup_country: form.pickup_country,
          pickup_postal: form.pickup_postal,
          pickup_city: cityFrom?.city || "",
          delivery_country: form.delivery_country,
          delivery_postal: form.delivery_postal,
          delivery_city: cityTo?.city || "",
          prefill: { sender: fromPrefill || null, receiver: toPrefill || null },
          goods,
          chargeableWeight,
        },
        option: {
          mode: option.mode,
          total_price_eur: Number(String(option.total_price).replace(" EUR", "")),
          earliest_pickup_date: option.earliest_pickup,
          transit_time_days: option.days ? option.days.split("–").map(Number) : [null, null],
          co2_emissions_grams: option.co2,
          description: option.description,
        },
        prefill: {
          sender: fromPrefill || null,
          receiver: toPrefill || null,
        },
      },
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🚛 Create new booking</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* FROM */}
        <section className="bg-white border rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-3">From</h3>

          {addrbook.length > 0 && (
            <div className="mb-2">
              <label className="text-sm text-gray-600 mr-2">Pick from address book:</label>
              <select
                className="border rounded p-1"
                value={addrSel.from}
                onChange={(e) => {
                  setAddrSel(s => ({ ...s, from: e.target.value }));
                  pickFromBookFrom(e.target.value);
                }}
              >
                <option value="">— Select —</option>
                {addrbook.map(a => (
                  <option key={a.id} value={a.id}>
                    {(a.label || a.business_name || a.address || "Address")} • {a.country_code}-{a.postal_code} {a.city}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">From - country</label>
              <select
                name="pickup_country"
                value={form.pickup_country}
                onChange={handleChange}
                className="mt-1 w-full border rounded p-2"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">From postal code</label>
              <div className="flex items-center gap-2">
                <input
                  name="pickup_postal"
                  value={form.pickup_postal}
                  onChange={handleChange}
                  className="mt-1 border rounded p-2 w-[140px]"
                />
                {cityFrom?.country === form.pickup_country && (
                  <span className="text-sm text-gray-600 mt-1">{cityFrom.city}</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* TO */}
        <section className="bg-white border rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-3">To</h3>

          {addrbook.length > 0 && (
            <div className="mb-2">
              <label className="text-sm text-gray-600 mr-2">Pick from address book:</label>
              <select
                className="border rounded p-1"
                value={addrSel.to}
                onChange={(e) => {
                  setAddrSel(s => ({ ...s, to: e.target.value }));
                  pickFromBookTo(e.target.value);
                }}
              >
                <option value="">— Select —</option>
                {addrbook.map(a => (
                  <option key={a.id} value={a.id}>
                    {(a.label || a.business_name || a.address || "Address")} • {a.country_code}-{a.postal_code} {a.city}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">To - country</label>
              <select
                name="delivery_country"
                value={form.delivery_country}
                onChange={handleChange}
                className="mt-1 w-full border rounded p-2"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">To - postal code</label>
              <div className="flex items-center gap-2">
                <input
                  name="delivery_postal"
                  value={form.delivery_postal}
                  onChange={handleChange}
                  className="mt-1 border rounded p-2 w-[140px]"
                />
                {cityTo?.country === form.delivery_country && (
                  <span className="text-sm text-gray-600 mt-1">{cityTo.city}</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Gods</h2>
        {goods.map((item, index) => (
          <div key={index} className="grid grid-cols-6 gap-2 mb-2 items-end">
            <label className="text-xs font-medium">Type</label>
            <label className="text-xs font-medium">Weight</label>
            <label className="text-xs font-medium">Length</label>
            <label className="text-xs font-medium">Width</label>
            <label className="text-xs font-medium">Height</label>
            <label className="text-xs font-medium">Quantity</label>

            <select name="type" value={item.type} onChange={(e) => handleGoodsChange(index, e)} className="col-span-1 border p-2 rounded">
              <option value="Colli">Colli/Part Load</option>
              <option value="Pallet">Pallet</option>
              <option value="FTL">Full Trailer Load (13.6 m)</option>
            </select>
            <input name="weight" placeholder="kg" value={item.weight} onChange={(e) => handleGoodsChange(index, e)} className="border p-2 rounded" />
            <input name="length" placeholder="cm" value={item.length} onChange={(e) => handleGoodsChange(index, e)} className="border p-2 rounded" />
            <input name="width" placeholder="cm" value={item.width} onChange={(e) => handleGoodsChange(index, e)} className="border p-2 rounded" />
            <input name="height" placeholder="cm" value={item.height} onChange={(e) => handleGoodsChange(index, e)} className="border p-2 rounded" />
            <div className="flex items-center">
              <input name="quantity" type="number" min="1" value={item.quantity} onChange={(e) => handleGoodsChange(index, e)} className="border p-2 rounded w-full" />
              {goods.length > 1 && <button onClick={() => removeGoodsRow(index)} className="ml-2 text-red-600">✕</button>}
            </div>
          </div>
        ))}

        <div className="text-sm mt-2">
          <strong>Chargeable weight:</strong>{" "}
          <span className={calculateChargeableWeight(goods) > 25160 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
            {Math.round(calculateChargeableWeight(goods))} kg
          </span>
        </div>

        <button
          onClick={() => setGoods([...goods, { type: "Colli", weight: "", length: "", width: "", height: "", quantity: 1 }])}
          className="mt-2 text-sm text-blue-600"
        >
          + Add row
        </button>
      </div>

      <button
        onClick={handleSubmit}
        className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 shadow"
      >
        Search freight options
      </button>

      {result && (
        <div className="mt-6 bg-white border rounded p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Avaliable freight options</h2>
          {Object.entries(result)
            .filter(([_, data]) => data && data.available === true)
            .map(([mode, data], i) => (
              <ResultCard
                key={i}
                transport={{
                  mode,
                  total_price: `${data.total_price_eur} EUR`,
                  earliest_pickup: data.earliest_pickup_date,
                  days: `${data.transit_time_days[0]}–${data.transit_time_days[1]}`,
                  co2: data.co2_emissions_grams,
                  description: data.description,
                }}
                selectedOption={selectedOption}
                onSelect={setSelectedOption}
              />
            ))}

          {Object.entries(result).filter(([_, data]) => data && data.available === true).length === 0 && (
            <div className="text-gray-500">No available options found for this route and weight.</div>
          )}
        </div>
      )}

      <button
        onClick={() => handleSelect(selectedOption)}
        disabled={!selectedOption}
        className={`mt-4 w-full py-2 rounded font-medium text-white shadow ${
          selectedOption ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"
        }`}
      >
        Proceed with selected option
      </button>
    </div>
  );
}

