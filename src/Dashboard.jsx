import { useEffect, useState } from "react";

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  let userId = 1;
  try {
    userId = window.loggedInUserId || 1;
  } catch (e) {
    console.warn("window.loggedInUserId not found – using fallback ID 1");
  }

  useEffect(() => {
    fetch(`https://easyfreightbooking-api.onrender.com/my_bookings?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Bookings fetched:", data);
        setBookings(data);
      })
      .catch((err) => {
        console.error("Failed to fetch bookings", err);
      });
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Mina Bokningar</h1>

        {bookings.length === 0 && (
          <p className="text-gray-600">Inga bokningar att visa just nu.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white p-4 rounded shadow">
              <div className="mb-2">
                <h2 className="font-semibold text-lg">
                  #{booking.id} – {booking.transport_type}
                </h2>
                <p className="text-sm text-gray-600">
                  {booking.pickup_country} → {booking.delivery_country}
                </p>
              </div>
              <div className="text-sm">
                <p><strong>Datum:</strong> {new Date(booking.created_at).toLocaleDateString()}</p>
                <p><strong>Gods:</strong> {booking.ldm} LDM, {booking.weight} kg</p>
                <p><strong>Pris:</strong> {booking.total_price} kr</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// Sidebar-komponent
export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r p-4 hidden md:block">
      <h2 className="text-xl font-semibold mb-4">EasyFreight</h2>
      <ul className="space-y-2">
        <li><a href="/dashboard" className="text-blue-600 font-medium">Dashboard</a></li>
        <li><a href="/bookings" className="text-gray-700">Mina bokningar</a></li>
        <li><a href="/account" className="text-gray-700">Mitt konto</a></li>
      </ul>
    </aside>
  );
}
