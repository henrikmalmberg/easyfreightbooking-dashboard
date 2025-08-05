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
  <div className="p-6">
    <h1 className="text-2xl font-bold text-green-700 mb-4">✅ React är igång!</h1>
    <p>user_id: {userId}</p>
    <p>Antal bokningar: {bookings.length}</p>
    <pre>{JSON.stringify(bookings, null, 2)}</pre>
  </div>
);



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
