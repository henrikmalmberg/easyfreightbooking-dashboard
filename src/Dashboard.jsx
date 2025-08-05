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
      .then((data) => setBookings(data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Mina Bokningar</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold text-lg mb-1">
              #{booking.id} – {booking.transport_type}
            </h2>
            <p className="text-sm text-gray-600">
              {booking.pickup_country} → {booking.delivery_country}
            </p>
            <p>Datum: {new Date(booking.created_at).toLocaleDateString()}</p>
            <p>Gods: {booking.ldm} LDM, {booking.weight} kg</p>
            <p>Pris: {booking.total_price} kr</p>
          </div>
        ))}
      </div>
    </div>
  );
}
