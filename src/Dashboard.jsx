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

export function Layout({ children }) {
  const [showSidebar, setShowSidebar] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className={`fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden ${showSidebar ? "block" : "hidden"}`} onClick={() => setShowSidebar(false)}></div>
      <Sidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />

      <main className="flex-1 p-4 md:p-8 overflow-auto w-full">
        <button className="md:hidden mb-4 text-blue-600" onClick={() => setShowSidebar(true)}>☰ Meny</button>
        {children}
      </main>
    </div>
  );
}

function Sidebar({ visible, onClose }) {
  return (
    <aside className={`fixed md:relative z-50 md:z-auto transform top-0 left-0 h-full w-64 bg-white border-r p-6 shadow-md transition-transform duration-300 ${visible ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      <h2 className="text-xl font-bold mb-6">EasyFreightBooking</h2>
      <nav className="space-y-3">
        <Link to="/dashboard" className="block text-blue-600 font-medium hover:text-blue-800" onClick={onClose}>
          Dashboard
        </Link>
        <Link to="/new-booking" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
          Ny bokning
        </Link>
        <Link to="/account" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
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

function NewBooking() {
  const [response, setResponse] = React.useState(null);

  const handleSubmit = async () => {
    const payload = {
      pickup_coordinate: [55.6050, 13.0038], // Malmö
      pickup_country: "SE",
      pickup_postal_prefix: "21",

      delivery_coordinate: [45.4642, 9.1900], // Milan
      delivery_country: "IT",
      delivery_postal_prefix: "20",

      chargeable_weight: 1000,
    };

    try {
      const res = await fetch("https://easyfreightbooking-api.onrender.com/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error("API error:", error);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">🧪 Testa API-anrop</h2>
      <button
        onClick={handleSubmit}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
      >
        Skicka testpayload
      </button>

      {response && (
        <div className="bg-white p-4 rounded shadow border">
          <h3 className="text-lg font-semibold mb-2">Svar från webservicen</h3>
          <pre className="text-sm text-gray-800 overflow-auto">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
