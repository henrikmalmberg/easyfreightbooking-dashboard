import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";

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
  { code: "MT", name: "Malta" }, { code: "UK", name: "United Kingdom" }, { code: "CH", name: "Switzerland" },
  { code: "UA", name: "Ukraine" }
];

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-booking" element={<NewBooking />} />
        </Routes>
      </Layout>
    </Router>
  );
}

function Dashboard() {
  const [bookings, setBookings] = React.useState([]);
  let userId = 1;
  try {
    userId = window.loggedInUserId || 1;
  } catch (e) {
    console.warn("window.loggedInUserId not found – using fallback ID 1");
  }

  React.useEffect(() => {
    fetch(`https://easyfreightbooking-api.onrender.com/my_bookings?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => setBookings(data))
      .catch((err) => console.error("Failed to fetch bookings", err));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">📦 Mina Bokningar</h1>
        <Link
          to="/new-booking"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
        >
          + Ny bokning
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="text-gray-500">Inga bokningar ännu.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-xl border bg-white p-5 shadow hover:shadow-md transition-shadow"
            >
              <div className="text-sm text-gray-500 mb-1">
                #{booking.id} – {booking.transport_type}
              </div>
              <div className="text-xl font-semibold text-gray-800">
                {booking.pickup_country} → {booking.delivery_country}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {new Date(booking.created_at).toLocaleDateString()}<br />
                {booking.ldm} LDM, {booking.weight} kg<br />
                <strong className="text-blue-600">{booking.total_price} kr</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ transport, onSelect }) {
  return (
    <div
      onClick={() => onSelect(transport)}
      className="cursor-pointer border rounded-lg p-4 mb-3 bg-white hover:bg-blue-50 shadow-sm transition"
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold text-lg">{transport.mode}</div>
        <div className="text-blue-600 font-bold text-lg">{transport.total_price} kr</div>
      </div>
      <div className="text-sm text-gray-600 mt-1">
        {transport.ldm} LDM, {transport.weight} kg<br />
        {transport.days} dagar • {transport.kilometers} km
      </div>
    </div>
  );
}

function NewBooking() {
  const [goods, setGoods] = React.useState([
    { type: "Colli", weight: "", length: "", width: "", height: "", quantity: 1 }
  ]);
  const [form, setForm] = React.useState({ pickup_country: "SE", pickup_postal: "", delivery_country: "SE", delivery_postal: "" });
  const [result, setResult] = React.useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoodsChange = (index, e) => {
    const { name, value } = e.target;
    const updated = [...goods];
    updated[index][name] = value;
    if (name === "type") {
      if (value === "FTL") {
        updated[index]["weight"] = "24000";
        updated[index]["length"] = "13.6";
      } else if (value === "Pallet") {
        updated[index]["length"] = "120";
        updated[index]["width"] = "80";
      }
    }
    setGoods(updated);
  };

  const addGoodsRow = () => setGoods([...goods, { type: "Colli", weight: "", length: "", width: "", height: "", quantity: 1 }]);
  const removeGoodsRow = (index) => setGoods(goods.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    try {
      const response = await fetch("https://easyfreightbooking-api.onrender.com/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, goods })
      });
      const data = await response.json();
      console.log("Response from API:", data);
      setResult(data);
    } catch (err) {
      console.error("API error:", err);
    }
  };

  const handleSelect = (option) => {
    console.log("Selected option:", option);
    navigate("/new-booking");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🚛 Skapa ny bokning</h1>
      {/* Resten av formuläret är oförändrat */}
      {/* ... */}

      <button
        onClick={handleSubmit}
        className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 shadow"
      >
        Beräkna pris
      </button>

      {result && (
        <div className="mt-6 bg-white border rounded p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Prisuppskattning</h2>
          {!result.options && <p className="text-red-600">❌ Inga alternativ hittades eller fel i API-svar.</p>}
          {result.options?.map((opt, i) => (
            <ResultCard key={i} transport={opt} onSelect={handleSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r p-6 shadow-md">
      <h2 className="text-xl font-bold mb-6">EasyFreight</h2>
      <nav className="space-y-3">
        <Link to="/dashboard" className="block text-blue-600 font-medium hover:text-blue-800">
          Dashboard
        </Link>
        <Link to="/new-booking" className="block text-gray-700 hover:text-blue-600">
          Ny bokning
        </Link>
        <Link to="/account" className="block text-gray-700 hover:text-blue-600">
          Mitt konto
        </Link>
        <hr className="my-4" />
        <button className="flex items-center text-sm text-gray-500 hover:text-red-500">
          Logga ut
        </button>
      </nav>
    </aside>
  );
}
