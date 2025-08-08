import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import BookingForm from "./BookingForm";
import { useState } from "react";

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


async function getCoordinates(postal, country) {
  const apiKey = "AIzaSyBwOgpWgeY6e4SPNiB1nc_jKKqlN_Yn6YI";
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${postal}&components=country:${country}&key=${apiKey}`
  );

  const data = await response.json();
  if (data.status !== "OK" || !data.results.length) return null;

  const result = data.results[0];

  const countryComponent = result.address_components.find((c) =>
    c.types.includes("country")
  );
  const countryCode = countryComponent?.short_name?.toUpperCase();

  if (!countryCode || countryCode !== country.toUpperCase()) {
    console.warn("❌ COUNTRY MISMATCH", { input: country, fromGoogle: countryCode });
    return null;
  }

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
        if (res?.city && res?.coordinate) {
          setData({ city: res.city, coordinate: res.coordinate, country });
        } else {
          setData(null);
        }
      });
    } else {
      setData(null);
    }

    return () => {
      active = false;
    };
  }, [postal, country]);

  return data;
}






export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-booking" element={<NewBooking />} />
		   <Route path="/confirm" element={<BookingForm />} /> {/* ✅ Ny bokningsvy */}
        </Routes>
      </Layout>
    </Router>
  );
}

function Dashboard() {
  const [bookings, setBookings] = React.useState(null); // null = loading
  const [openId, setOpenId] = React.useState(null); // ✅ Hanterar utfällning
  let userId = 1;
  try {
    userId = window.loggedInUserId || 1;
  } catch {}

  React.useEffect(() => {
    let abort = false;
    async function load() {
      try {
        const res = await fetch(`https://easyfreightbooking-api.onrender.com/bookings?user_id=${userId}`);
        const data = await res.json();
        if (!abort) setBookings(data);
      } catch (e) {
        console.error(e);
        if (!abort) setBookings([]);
      }
    }
    load();
    return () => { abort = true; };
  }, [userId]);

  return (
    <div>
      
		


 {Array.isArray(bookings) && bookings.length > 0 && (
        <>
          <h1 className="text-3xl font-bold mb-4">📦 My bookings</h1>
          <div className="bg-white shadow rounded-lg max-w-4xl">
            <ul className="divide-y divide-gray-200">
              {bookings.map((b) => {
                const from = b.sender_address;
                const to = b.receiver_address;
                const routeFrom = from
                  ? `${from.country_code} ${from.postal_code || ""} ${from.city || ""}`
                  : "–";
                const routeTo = to
                  ? `${to.country_code} ${to.postal_code || ""} ${to.city || ""}`
                  : "–";

                const isOpen = openId === b.id;

                return (
                  <li key={b.id} className="px-4 py-4 hover:bg-gray-50 transition">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setOpenId(isOpen ? null : b.id)}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">#{b.id.slice(0, 8)}</span>
                        <span className="font-medium text-gray-800">
                          {routeFrom} → {routeTo}
                        </span>
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
    
    {/* Alla datumfält */}
    {b.created_at && (
      <div>Created: {new Date(b.created_at).toLocaleString()}</div>
    )}
    {b.earliest_pickup_date && (
      <div>Earliest pickup: {new Date(b.earliest_pickup_date).toLocaleDateString()}</div>
    )}
    {b.requested_pickup_date && (
      <div>Requested pickup: {new Date(b.requested_pickup_date).toLocaleDateString()}</div>
    )}
    {b.requested_delivery_date && (
      <div>Requested delivery: {new Date(b.requested_delivery_date).toLocaleDateString()}</div>
    )}

    {/* Godsparametrar */}
    {Array.isArray(b.goods) && b.goods.map((g, idx) => (
      <div key={idx} className="ml-2">
        📦 Goods #{idx + 1}: {g.weight} kg, {g.length} cm × {g.width} cm × {g.height} cm, qty: {g.quantity}
      </div>
    ))}

    {/* Fraktdragande vikt */}
    {b.chargeable_weight_kg && (
      <div>
        📏 Chargeable weight: {b.chargeable_weight_kg} kg
      </div>
    )}

    {/* CO₂ — OBS: justera faktorn här om API redan returnerar kg */}
    {b.co2_emissions && (
      <div>
        🌍 CO₂: {((Number(b.co2_emissions)).toFixed(1))} kg
      </div>
    )}
  </div>
)}

                  </li>
                );
              })}
            </ul>
          </div>
        </>
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
        <button className="md:hidden mb-4 text-blue-600" onClick={() => setShowSidebar(true)}>☰ Menu</button>
        {children}
      </main>
    </div>
  );
}

function ResultCard({ transport, selectedOption, onSelect }) {
  const [showInfo, setShowInfo] = React.useState(false);

  const icons = {
    road_freight: "🚛",
    express_road: "🚀",
    ocean_freight: "🚢",
    intermodal_rail: "🚚🚆",
    conventional_rail: "🚆"
  };

  const isSelected = selectedOption?.mode === transport.mode;

  return (
    <div
      onClick={() => onSelect(transport)}
      className={`cursor-pointer border rounded-lg p-4 mb-3 bg-white shadow-sm transition ${
        isSelected ? "border-blue-600 bg-blue-50" : "hover:bg-blue-50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        {/* Vänstersida: ikoner + label + info-ikon */}
        <div className="flex items-center gap-2 text-lg font-semibold capitalize relative">
          <input
            type="radio"
            name="selectedTransport"
            checked={isSelected}
            onChange={() => onSelect(transport)}
          />
          <span>{icons[transport.mode]}</span>
          <span>{transport.mode.replace("_", " ")}</span>

          {transport.description && (
            <>
              <span
                className="ml-1 text-gray-400 cursor-pointer hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfo(!showInfo);
                }}
              >
                ⓘ
              </span>
              {showInfo && (
                <div className="absolute top-6 left-0 w-64 p-2 text-sm text-gray-800 bg-white border rounded shadow-md z-10">
                  {transport.description}
                </div>
              )}
            </>
          )}
        </div>

        {/* Högersida: pris */}
        <div className="text-blue-600 font-bold text-lg">{transport.total_price}</div>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <div>
          <strong>Earliest pickup:</strong> {transport.earliest_pickup}
        </div>
        <div>
          <strong>Transit time:</strong> {transport.days} days
        </div>
        {transport.co2 && (
          <div>
            <strong>🌍 CO₂ emissions:</strong>{" "}
            {(transport.co2 / 1000).toFixed(1)} kg
          </div>
        )}
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
    const [selectedOption, setSelectedOption] = React.useState(null); // ✅ FLYTTAD HIT
  const navigate = useNavigate();
  
  const calculateChargeableWeight = (goods) => {
  return goods.reduce((total, item) => {
    const weight = parseFloat(item.weight) || 0;
    const length = parseFloat(item.length) / 100 || 0;
    const width = parseFloat(item.width) / 100 || 0;
    const height = parseFloat(item.height) / 100 || 0;
    const quantity = parseInt(item.quantity) || 0;

    const volumeWeight = length * width * height * 335;
    const chargeable = Math.max(weight, volumeWeight);

    return total + chargeable * quantity;
  }, 0);
};
  
    function calculateTotalWeight(goods) {
    return goods.reduce((total, item) => {
      const weight = parseFloat(item.weight) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return total + weight * quantity;
    }, 0);
  }
const chargeableWeight = calculateChargeableWeight(goods);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
	const cityFrom = useCityLookup(form.pickup_postal, form.pickup_country);
	const cityTo = useCityLookup(form.delivery_postal, form.delivery_country);
	
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
  const removeGoodsRow = (index) => setGoods(goods.filter((_, i) => i !== index));

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
  const res = await fetch("https://easyfreightbooking-api.onrender.com/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    setResult(data); // ⬅️ visa alternativen
  } catch (err) {
    console.error(err);
    alert(`Could not fetch prices: ${err.message}`);
  }
};



const handleSelect = (option) => {
  if (!option) return;

  navigate("/confirm", {           // ⬅️ var "/new-booking"
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
        transit_time_days: option.days
          ? option.days.split("–").map((n) => Number(n))
          : [null, null],
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
			{COUNTRIES.map((c) => (
<option key={c.code} value={c.code}>
  {c.name}
</option>
			))}
			</select>
			</div>
		
		<div>
			<label className="block text-sm font-medium">From postal code</label>
			<div className="flex items-center gap-2">
				<input
					name="pickup_postal"
					value={form.pickup_postal}
					onChange={handleChange}
					className="mt-1 border rounded p-2 w-[120px]" 
				/>
		
				{cityFrom?.country === form.pickup_country && (
					<span className="text-sm text-gray-600 mt-1">{cityFrom.city}</span>
				)}
		
			</div>
		</div>



<div>
          <label className="block text-sm font-medium">To - country</label>
			<select name="delivery_country" value={form.delivery_country} onChange={handleChange} className="mt-1 w-full border rounded p-2">
			{COUNTRIES.map((c) => (
<option key={c.code} value={c.code}>
  {c.name}
</option>
			))}
			</select>
        </div>
		
		<div>
			<label className="block text-sm font-medium">To - postal code</label>
			<div className="flex items-center gap-2">
				<input
					name="delivery_postal"
					value={form.delivery_postal}
					onChange={handleChange}
					className="mt-1 border rounded p-2 w-[120px]"
				/>
				
				{cityTo?.country === form.delivery_country && (
					<span className="text-sm text-gray-600 mt-1">{cityTo.city}</span>
				)}
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
              {goods.length > 1 && (
                <button onClick={() => removeGoodsRow(index)} className="ml-2 text-red-600">✕</button>
              )}
            </div>
          </div>
        ))}
		<div className="text-sm mt-2">
  <strong>Chargeable weight:</strong>{" "}
  <span className={chargeableWeight > 25160 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
    {Math.round(chargeableWeight)} kg
  </span>
  {" "}
</div>

        <button onClick={addGoodsRow} className="mt-2 text-sm text-blue-600">+ Add row</button>
      </div>

      <button
        onClick={handleSubmit}
        className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 shadow"
      >
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


function Sidebar({ visible, onClose }) {
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
        <Link to="/account" className="block text-gray-700 hover:text-blue-600" onClick={onClose}>
          My account
        </Link>
        <hr className="my-4" />
        <button className="flex items-center text-sm text-gray-500 hover:text-red-500">
          Log out
        </button>
      </nav>
    </aside>
  );
}
