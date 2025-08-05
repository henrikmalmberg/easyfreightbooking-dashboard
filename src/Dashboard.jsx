import React from "react";
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { LogOut, Menu, User, Plus } from "lucide-react";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-booking" element={<NewBooking />} />
      </Routes>
    </Router>
  );
}

function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  let userId = 1;
  try {
    userId = window.loggedInUserId || 1;
  } catch (e) {
    console.warn("window.loggedInUserId not found – using fallback ID 1");
  }

  useEffect(() => {
    fetch(`https://easyfreightbooking-api.onrender.com/my_bookings?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => setBookings(data))
      .catch((err) => console.error("Failed to fetch bookings", err));
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 text-gray-800">
      <MobileHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} userId={userId} />
      <Sidebar isOpen={sidebarOpen} />
      <main className="flex-1 p-6">
        <div className="hidden md:flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">📦 Mina Bokningar</h1>
          <Link
            to="/new-booking"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Ny bokning
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="text-gray-500">Inga bokningar ännu.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-sm text-gray-500 mb-1">
                  #{booking.id} - {booking.transport_type}
                </div>
                <div className="text-lg font-semibold">
                  {booking.pickup_country} → {booking.delivery_country}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {new Date(booking.created_at).toLocaleDateString()}<br />
                  {booking.ldm} LDM, {booking.weight} kg<br />
                  <strong>{booking.total_price} kr</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function NewBooking() {
  const [form, setForm] = useState({
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

  const [result, setResult] = useState(null);

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border rounded-xl shadow-md p-8 w-full max-w-xl">
        <h1 className="text-2xl font-bold mb-6">🚛 Skapa ny bokning</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label>Pickup Country</label>
            <input name="pickup_country" value={form.pickup_country} onChange={handleChange} className="input" />
          </div>
          <div>
            <label>Pickup Postal</label>
            <input name="pickup_postal" value={form.pickup_postal} onChange={handleChange} className="input" />
          </div>
          <div>
            <label>Pickup Place</label>
            <input name="pickup_place" value={form.pickup_place} onChange={handleChange} className="input" />
          </div>
          <div>
            <label>Delivery Country</label>
            <input name="delivery_country" value={form.delivery_country} onChange={handleChange} className="input" />
          </div>
          <div>
            <label>Delivery Postal</label>
            <input name="delivery_postal" value={form.delivery_postal} onChange={handleChange} className="input" />
          </div>
          <div>
            <label>Delivery Place</label>
            <input name="delivery_place" value={form.delivery_place} onChange={handleChange} className="input" />
          </div>
          <div>
            <label>Weight (kg)</label>
            <input name="weight" type="number" value={form.weight} onChange={handleChange} className="input" />
          </div>
          <div>
            <label>LDM</label>
            <input name="ldm" type="number" value={form.ldm} onChange={handleChange} className="input" />
          </div>
          <div className="md:col-span-2">
            <label>Transport Type</label>
            <select name="transport_type" value={form.transport_type} onChange={handleChange} className="input">
              <option value="road">Road</option>
              <option value="intermodal">Intermodal</option>
              <option value="rail">Rail</option>
              <option value="ocean">Ocean</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Beräkna pris
        </button>

        {result && (
          <div className="mt-6 bg-gray-100 p-4 rounded">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileHeader({ onToggleSidebar, userId }) {
  return (
    <div className="md:hidden flex items-center justify-between bg-white border-b p-4 shadow-sm">
      <button onClick={onToggleSidebar}>
        <Menu className="w-6 h-6 text-gray-700" />
      </button>
      <h1 className="text-xl font-bold">EasyFreight</h1>
      <button className="inline-flex items-center gap-1 text-sm bg-gray-100 px-2 py-1 rounded">
        <User className="w-4 h-4" /> #{userId}
      </button>
    </div>
  );
}

function Sidebar({ isOpen }) {
  return (
    <aside
      className={`${
        isOpen ? "block" : "hidden"
      } md:block w-64 bg-white border-r p-6 shadow-sm fixed md:static top-0 left-0 h-full z-50`}
    >
      <h2 className="text-xl font-bold mb-6">EasyFreight</h2>
      <nav className="space-y-3">
        <Link to="/dashboard" className="block text-blue-600 font-medium">
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
          <LogOut className="w-4 h-4 mr-2" /> Logga ut
        </button>
      </nav>
    </aside>
  );
}
