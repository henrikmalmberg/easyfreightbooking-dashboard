import { useEffect, useState } from "react";
import { LogOut, Menu, User } from "lucide-react";

export default function Dashboard() {
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
      .then((data) => {
        console.log("Bookings fetched:", data);
        setBookings(data);
      })
      .catch((err) => {
        console.error("Failed to fetch bookings", err);
      });
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 text-gray-800">
      <MobileHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} userId={userId} />
      <Sidebar isOpen={sidebarOpen} />
      <main className="flex-1 p-6">
        <div className="hidden md:flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">📦 Mina Bokningar</h1>
          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-gray-200 hover:bg-gray-300">
            <User className="w-4 h-4" />
            Användare #{userId}
          </button>
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
        <a href="/dashboard" className="block text-blue-600 font-medium">
          Dashboard
        </a>
        <a href="/bookings" className="block text-gray-700 hover:text-blue-600">
          Mina bokningar
        </a>
        <a href="/account" className="block text-gray-700 hover:text-blue-600">
          Mitt konto
        </a>
        <hr className="my-4" />
        <button className="flex items-center text-sm text-gray-500 hover:text-red-500">
          <LogOut className="w-4 h-4 mr-2" /> Logga ut
        </button>
      </nav>
    </aside>
  );
}
