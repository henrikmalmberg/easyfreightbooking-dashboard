import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";


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

function NewBooking() {
  const [form, setForm] = React.useState({
    pickup_country: "SE",
    pickup_postal: "",
    pickup_place: "",
    delivery_country: "DE",
    delivery_postal: "",
    delivery_place: "",
    weight: "",
    ldm: "",
    transport_type: "road"
  });

  const [result, setResult] = React.useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch("https://easyfreightbooking-api.onrender.com/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("API error:", err);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🚛 Skapa ny bokning</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Pickup Country</label>
          <input name="pickup_country" value={form.pickup_country} onChange={handleChange} className="input w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1">Pickup Postal</label>
          <input name="pickup_postal" value={form.pickup_postal} onChange={handleChange} className="input w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1">Pickup Place</label>
          <input name="pickup_place" value={form.pickup_place} onChange={handleChange} className="input w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1">Delivery Country</label>
          <input name="delivery_country" value={form.delivery_country} onChange={handleChange} className="input w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1">Delivery Postal</label>
          <input name="delivery_postal" value={form.delivery_postal} onChange={handleChange} className="input w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1">Delivery Place</label>
          <input name="delivery_place" value={form.delivery_place} onChange={handleChange} className="input w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1">Weight (kg)</label>
          <input name="weight" type="number" value={form.weight} onChange={handleChange} className="input w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1">LDM</label>
          <input name="ldm" type="number" value={form.ldm} onChange={handleChange} className="input w-full border rounded px-3 py-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block mb-1">Transport Type</label>
          <select name="transport_type" value={form.transport_type} onChange={handleChange} className="input w-full border rounded px-3 py-2">
            <option value="road">Road</option>
            <option value="intermodal">Intermodal</option>
            <option value="rail">Rail</option>
            <option value="ocean">Ocean</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 shadow"
      >
        Beräkna pris
      </button>

      {result && (
        <div className="mt-6 bg-white border rounded p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Prisuppskattning</h2>
          <pre className="text-sm text-gray-700">{JSON.stringify(result, null, 2)}</pre>
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
