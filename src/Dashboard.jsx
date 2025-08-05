import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Mina Bokningar</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <CardTitle>#{booking.id} - {booking.transport_type}</CardTitle>
                <CardDescription>
                  {booking.pickup_country} → {booking.delivery_country}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p><strong>Datum:</strong> {new Date(booking.created_at).toLocaleDateString()}</p>
                <p><strong>Gods:</strong> {booking.ldm} LDM, {booking.weight} kg</p>
                <p><strong>Pris:</strong> {booking.total_price} kr</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
} 

// Mocked Sidebar component (you can customize this)
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
