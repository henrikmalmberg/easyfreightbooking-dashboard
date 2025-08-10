import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import BookingForm from "./BookingForm";

/* =====================  API helpers  ===================== */
const API = "https://easyfreightbooking-api.onrender.com";

// Hämta token från localStorage (stöd för flera nycklar + global fallback)
function getToken() {
  return (
    localStorage.getItem("jwt") ||
    localStorage.getItem("EFB_TOKEN") ||
    window.__EFB_TOKEN__ ||
    ""
  );
}

// Endast Authorization för GET; POST/PUT använder en separat helper
const authHeaders = () => ({
  Authorization: "Bearer " + getToken(),
});

async function authedGet(path) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

async function authedPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

/* =====================  Data  ===================== */
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
  { code: "UK", name: "United Kingdom" }, { code: "CH", name: "Switzerland" },
  { code: "UA", name: "Ukraine" }
];

/* =====================  Geocoding  ===================== */
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
  const [data, setData] = React.useState(null);
  React.useEffect(() => {
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

/* =====================  App / Routing  ===================== */
export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/dashboard" element={<Welcome />} />
          <Route path="/new-booking" element={<NewBooking />} />
          <Route path="/confirm" element={<BookingForm />} />
          <Route path="/view-bookings" element={<ViewBookings />} />
          <Route path="/account" element={<MyAccount />} />
        </Routes>
      </Layout>
    </Router>
  );
}

function Welcome() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Welcome 👋</h1>
      <p className="text-gray-600">Use the menu to create a booking or view your organisation’s bookings.</p>
    </div>
  );
}

/* =====================  Layout & Sidebar  ===================== */
export function Layout({ children }) {
  const [showSidebar, setShowSidebar] = React.useState(false);
  return (
    <div className="flex min-h-screen bg-gray-100">
      <div
        className={`fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden ${showSidebar ? "block" : "hidden"}`}
        onClick={() => setShowSidebar(false)}
      />
      <Sidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />

      <main className="flex-1 p-4 md:p-8 overflow-auto w-full">
        <button className="md:hidden mb-4 text-blue-600" onClick={() => setShowSidebar(true)}>☰ Menu</button>
        {children}
      </main>
    </div>
  );
}

function Sidebar({ visible, onClose }) {
  const [me, setMe] = React.useState(null);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    authedGet("/me")
      .then((d) => alive && setMe(d))
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, []);

  const logout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("EFB_TOKEN");
    window.location.href = "/"; // hård omladdning så att state nollas
  };

  return (
    <aside className={`fixed md:relative z-50 md:z-auto transform top-0 left-0 h-full w-64 bg-white border-r p-6 shadow-md transition-transform duration-300 ${visible ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      <Link to="/" onClick={onClose} className="block mb-6">
        <img src="/logo.png" alt="EasyFreightBooking Logo" className="h-18 w-auto" />
      </Link>

      <nav className="space-y-3">
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

        <hr className="my-4" />
        <button onClick={logout} className="flex items-center text-sm text-gray-500 hover:text-red-500">
          Log out
        </button>
      </nav>

      {/* Tre rader info från /me */}
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
    </aside>
  );
}

/* =====================  Bookings list (expand/collapse)  ===================== */
function BookingsList({ bookings }) {
  const [openId, setOpenId] = React.useState(null);
  if (!Array.isArray(bookings) || bookings.length === 0) {
    return <div className="text-gray-500">No bookings yet.</div>;
  }
  return (
    <div className="bg-white shadow rounded-lg max-w-4xl">
      <ul className="divide-y divide-gray-200">
        {bookings.map((b) => {
          const from = b.sender_address;
          const to = b.receiver_address;
          const routeFrom = from ? `${from.country_code} ${from.postal_code || ""} ${from.city || ""}` : "–";
          const routeTo   = to   ? `${to.country_code} ${to.postal_code || ""} ${to.city || ""}`   : "–";
          const isOpen = openId === b.id;

          return (
            <li key={b.id} className="px-4 py-4 hover:bg-gray-50 transition">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpenId(isOpen ? null : b.id)}>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">#{String(b.id).slice(0, 8)}</span>
                  <span className="font-medium text-gray-800">{routeFrom} → {routeTo}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {b.chargeable_weight_kg ? `${b.chargeable_weight_kg} kg` : ""}
                  </span>
                  <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 pl-2 border-l border-gray-200 text-sm text-gray-600 space-y-1">
                  <div>Mode: {b.selected_mode?.replaceAll("_", " ") || "—"}</div>
                  <div>Price: {typeof b.price_eur === "number" ? `${b.price_eur.toFixed(0)} EUR` : "—"}</div>
                  {b.created_at && <div>Created: {new Date(b.created_at).toLocaleString()}</div>}
                  {b.requested_pickup_date && <div>Requested pickup: {new Date(b.requested_pickup_date).toLocaleDateString()}</div>}
                  {b.requested_delivery_date && <div>Requested delivery: {new Date(b.requested_delivery_date).toLocaleDateString()}</div>}
                  {Array.isArray(b.goods) && b.goods.map((g, idx) => (
                    <div key={idx} className="ml-2">
                      📦 Goods #{idx + 1}: {g.weight} kg, {g.length}×{g.width}×{g.height} cm, qty: {g.quantity}
                    </div>
                  ))}
                  {b.co2_emissions && <div>🌍 CO₂: {Number(b.co2_emissions).toFixed(1)} kg</div>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* =====================  View bookings (JWT)  ===================== */
function ViewBookings() {
  const [bookings, setBookings] = React.useState(null);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    authedGet("/bookings")
      .then((data) => alive && setBookings(data))
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">📦 View bookings</h1>
      {err && <div className="text-red-600 mb-2">{String(err)}</div>}
      {bookings === null ? <div>Loading…</div> : <BookingsList bookings={bookings} />}
    </div>
  );
}

/* =====================  My account + Invite colleague  ===================== */
function MyAccount() {
  const [me, setMe] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [invite, setInvite] = React.useState({ name: "", email: "", password: "", role: "user" });
  const [inviteMsg, setInviteMsg] = React.useState("");

  React.useEffect(() => {
    authedGet("/me").then(setMe).catch((e) => setErr(e.message));
  }, []);

  async function sendInvite(e) {
    e.preventDefault();
    setInviteMsg("");
    try {
      await authedPost("/invite-user", invite);
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
      {me ? (
        <div className="mb-8 bg-white rounded border p-4 space-y-1">
          <div><strong>Organization:</strong> {me.organization.company_name}</div>
          <div><strong>VAT:</strong> {me.organization.vat_number}</div>
          <div><strong>Name:</strong> {me.user.name}</div>
          <div><strong>Email:</strong> {me.user.email}</div>
          <div><strong>Role:</strong> {me.user.role}</div>
        </div>
      ) : (
        <div>Loading…</div>
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

/* =====================  New booking  ===================== */
function ResultCard({ transport, selectedOption, onSelect }) {
  const [showInfo, setShowInfo] = React.useState(false);
  const icons = {
    road_freight: "🚛",
    express_road: "🚀",
    ocean_freight: "🚢",
    intermodal_rail: "🚚🚆",
    conventional_rail: "🚆",
  };
  const isSelected = selectedOption?.mode === transport.mode;

  return (
    <div onClick={() => onSelect(transport)}
         className={`cursor-pointer border rounded-lg p-4 mb-3 bg-white shadow-sm transition ${
           isSelected ? "border-blue-600 bg-blue-50" : "hover:bg-blue-50"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-lg font-semibold capitalize relative">
          <input type="radio" name="selectedTransport" checked={isSelected} onChange={() => onSelect(transport)} />
          <span>{icons[transport.mode]}</span>
          <span>{transport.mode.replace("_", " ")}</span>
          {transport.description && (
            <>
              <span className="ml-1 text-gray-400 cursor-pointer hover:text-blue-600"
                    onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}>ⓘ</span>
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
        {transport.co2 && <div><strong>🌍 CO₂ emissions:</strong> {(transport.co2 / 1000).toFixed(1)} kg</div>}
      </div>
    </div>
  );
}

function NewBooking() {
  const [goods, setGoods] = React.useState([{ type: "Colli", weight: "", length: "", width: "", height: "", quantity: 1 }]);
  const [form, setForm] = React.useState({ pickup_country: "SE", pickup_postal: "", delivery_country: "SE", delivery_postal: "" });
  const [result, setResult] = React.useState(null);
  const [selectedOption, setSelectedOption] = React.useState(null);
  const navigate = useNavigate();

  const calculateChargeableWeight = (goods) => goods.reduce((total, item) => {
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

  const addGoodsRow = () => setGoods([...goods, { type: "Colli", weight: "", length: "", width: "", height: "", quantity: 1 }]);
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
          goods,
          chargeableWeight,
        },
        option: {
          mode: option.mode,
          total_price_eur: Number(String(option.total_price).replace(" EUR", "")),
          earliest_pickup_date: option.earliest_pickup,
          transit_time_days: option.days ? option.days.split("–").map((n) => Number(n)) : [null, null],
          co2_emissions_grams: option.co2,
          description: option.description,
        },
      },
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🚛 Create new booking</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">From - country</label>
          <select name="pickup_country" value={form.pickup_country} onChange={handleChange} className="mt-1 w-full border rounded p-2">
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">From postal code</label>
          <div className="flex items-center gap-2">
            <input name="pickup_postal" value={form.pickup_postal} onChange={handleChange} className="mt-1 border rounded p-2 w-[120px]" />
            {cityFrom?.country === form.pickup_country && <span className="text-sm text-gray-600 mt-1">{cityFrom.city}</span>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">To - country</label>
          <select name="delivery_country" value={form.delivery_country} onChange={handleChange} className="mt-1 w-full border rounded p-2">
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">To - postal code</label>
          <div className="flex items-center gap-2">
            <input name="delivery_postal" value={form.delivery_postal} onChange={handleChange} className="mt-1 border rounded p-2 w-[120px]" />
            {cityTo?.country === form.delivery_country && <span className="text-sm text-gray-600 mt-1">{cityTo.city}</span>}
          </div>
        </div>
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
          <span className={chargeableWeight > 25160 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
            {Math.round(chargeableWeight)} kg
          </span>
        </div>

        <button onClick={() => setGoods([...goods, { type: "Colli", weight: "", length: "", width: "", height: "", quantity: 1 }])}
                className="mt-2 text-sm text-blue-600">
          + Add row
        </button>
      </div>

      <button onClick={handleSubmit}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 shadow">
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
