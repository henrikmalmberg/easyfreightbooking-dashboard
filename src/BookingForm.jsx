// src/BookingForm.jsx
import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

/* ==== API helpers (lokala till denna fil) ==== */
const API = "https://easyfreightbooking-api.onrender.com";
const getToken = () => localStorage.getItem("jwt") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: "Bearer " + getToken(),
});
async function authedFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
  const txt = await res.text();
  let body = null;
  try {
    body = txt ? JSON.parse(txt) : null;
  } catch {}
  if (!res.ok) throw new Error(body?.error || txt || `HTTP ${res.status}`);
  return body;
}

/* ==== Små presentational-komponenter ==== */
function InfoItem({ label, value, emphasize = false }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
      <span className={`mt-0.5 ${emphasize ? "font-semibold text-emerald-700" : "text-gray-900"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function SummaryHeader({ search, option }) {
  return (
    <section className="rounded-lg border bg-white px-6 py-5 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Booking details</h2>
          <p className="mt-1 text-sm text-gray-500">
            {search.pickup_country} ({search.pickup_postal}
            {search.pickup_city ? ` ${search.pickup_city}` : ""}) →{" "}
            {search.delivery_country} ({search.delivery_postal}
            {search.delivery_city ? ` ${search.delivery_city}` : ""})
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-gray-900">
            {option.total_price_eur} <span className="text-base font-normal text-gray-500">EUR</span>
          </div>
          <div className="text-xs text-gray-500">excl. VAT</div>
        </div>
      </div>

      <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <InfoItem label="Selected product" value={option.mode.replaceAll("_", " ")} />
        <InfoItem label="Earliest pickup" value={option.earliest_pickup_date} />
        <InfoItem
          label="Transit"
          value={
            Array.isArray(option.transit_time_days)
              ? `${option.transit_time_days[0]}–${option.transit_time_days[1]} days`
              : option.transit_time_days
          }
        />
        <InfoItem label="CO₂ (est.)" value={`${(option.co2_emissions_grams / 1000).toFixed(1)} kg`} />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <InfoItem
          label="Quantity"
          value={String((search.goods ?? []).reduce((a, g) => a + (Number(g.quantity) || 0), 0) || 1)}
        />
        <InfoItem
          label="Total weight"
          value={`${Math.round(
            (search.goods ?? []).reduce((a, g) => a + (Number(g.weight) || 0) * (Number(g.quantity) || 1), 0)
          )} kg`}
        />
        <InfoItem label="Chargeable weight" value={`${Math.round(search.chargeableWeight)} kg`} />
        <div />
      </div>
    </section>
  );
}

function AddressSection({
  title,
  value,
  onChange,
  lockedCountry,
  lockedPostal,
  schedule,
  onScheduleChange,
  scheduleLabel,
}) {
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Country</label>
          <input className="mt-1 w-full border rounded p-2 bg-gray-50 text-gray-700" value={lockedCountry} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Postal code</label>
          <input className="mt-1 w-full border rounded p-2 bg-gray-50 text-gray-700" value={lockedPostal} disabled />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">City</label>
          <input
            className="mt-1 w-full border rounded p-2"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder="City"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Business name</label>
          <input
            className="mt-1 w-full border rounded p-2"
            value={value.business_name}
            onChange={(e) => onChange({ ...value, business_name: e.target.value })}
            placeholder="Business name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input
            className="mt-1 w-full border rounded p-2"
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            placeholder="Street, no."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Address 2 (optional)</label>
          <input
            className="mt-1 w-full border rounded p-2"
            value={value.address2}
            onChange={(e) => onChange({ ...value, address2: e.target.value })}
            placeholder="Building, floor, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Contact name</label>
          <input
            className="mt-1 w-full border rounded p-2"
            value={value.contact_name}
            onChange={(e) => onChange({ ...value, contact_name: e.target.value })}
            placeholder="Contact person"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            className="mt-1 w-full border rounded p-2"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            placeholder="+46 ..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            className="mt-1 w-full border rounded p-2"
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Opening hours</label>
          <input
            className="mt-1 w-full border rounded p-2"
            value={value.opening_hours}
            onChange={(e) => onChange({ ...value, opening_hours: e.target.value })}
            placeholder="e.g. Mon–Fri 08:00–16:00"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Instructions to driver</label>
          <textarea
            className="mt-1 w-full border rounded p-2"
            rows={3}
            value={value.instructions}
            onChange={(e) => onChange({ ...value, instructions: e.target.value })}
            placeholder="Gate code, loading dock, forklift on site, etc."
          />
        </div>

        {schedule && onScheduleChange && (
          <div className="md:col-span-2 mt-4 border-t pt-3">
            <label className={`block text-sm font-medium text-gray-700 ${schedule.asap ? "opacity-50" : ""}`}>
              {scheduleLabel || "Requested date"}
            </label>
            <input
              type="date"
              className="mt-1 w-full border rounded p-2"
              disabled={schedule.asap}
              value={schedule.date}
              onChange={(e) => onScheduleChange({ ...schedule, date: e.target.value })}
              min={new Date().toISOString().slice(0, 10)}
            />
            <label className="inline-flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                checked={schedule.asap}
                onChange={(e) => onScheduleChange({ ...schedule, asap: e.target.checked })}
              />
              <span>As soon as possible</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==== Huvudkomponent ==== */
export default function BookingForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const [pickupSchedule, setPickupSchedule] = useState({ asap: true, date: "" });
  const [deliverySchedule, setDeliverySchedule] = useState({ asap: true, date: "" });
  const [approvals, setApprovals] = useState({ terms: false, gdpr: false });

  const loggedInUser = location.state?.user ?? { name: "", phone: "", email: "" };
  const booker = { name: loggedInUser.name, email: loggedInUser.email, phone: loggedInUser.phone };

  const [updateContact, setUpdateContact] = useState({
    name: loggedInUser.name,
    phone: loggedInUser.phone,
    email: loggedInUser.email,
  });

  const search = location.state?.search ?? {
    pickup_country: "SE",
    pickup_postal: "21617",
    pickup_city: "Limhamn",
    delivery_country: "DE",
    delivery_postal: "20457",
    delivery_city: "Hamburg",
    goods: [{ type: "Pallet", weight: "150", length: "120", width: "80", height: "60", quantity: 2 }],
    chargeableWeight: 300,
  };

  const option = location.state?.option ?? {
    mode: "road_freight",
    total_price_eur: 999,
    earliest_pickup_date: "2025-08-14",
    transit_time_days: [2, 3],
    co2_emissions_grams: 123456,
    description: "Road freight option",
  };

  const [pickup, setPickup] = useState({
    city: search.pickup_city || "",
    business_name: "",
    address: "",
    address2: "",
    contact_name: "",
    phone: "",
    email: "",
    opening_hours: "",
    instructions: "",
  });

  const [delivery, setDelivery] = useState({
    city: search.delivery_city || "",
    business_name: "",
    address: "",
    address2: "",
    contact_name: "",
    phone: "",
    email: "",
    opening_hours: "",
    instructions: "",
  });

  const [refs, setRefs] = useState({ reference1: "", reference2: "" });
  const [addons, setAddons] = useState({ tail_lift: false, pre_notice: false });

  const chargeableWeight = Number(search.chargeableWeight ?? 0);
  const totalWeight = (search.goods ?? []).reduce(
    (acc, g) => acc + (Number(g.weight) || 0) * (Number(g.quantity) || 1),
    0
  );

  // helpers för att applicera adressboksposter
const applyToPickup = (a) =>
  setPickup((p) => ({
    ...p,
    business_name: a.business_name || "",
    address: a.address || "",
    address2: a.address2 || "",        // <— lägg till
    city: a.city || "",
    contact_name: a.contact_name || "",
    phone: a.phone || "",
    email: a.email || "",
    opening_hours: a.opening_hours || "",
    instructions: a.instructions || "",
  }));

const applyToDelivery = (a) =>
  setDelivery((p) => ({
    ...p,
    business_name: a.business_name || "",
    address: a.address || "",
    address2: a.address2 || "",        // <— lägg till
    city: a.city || "",
    contact_name: a.contact_name || "",
    phone: a.phone || "",
    email: a.email || "",
    opening_hours: a.opening_hours || "",
    instructions: a.instructions || "",
  }));

// Prefill från prissökningen (om användaren valde ur adressboken där)
useEffect(() => {
  const pre = location.state?.prefill;
  if (pre?.sender)  applyToPickup(pre.sender);
  if (pre?.receiver) applyToDelivery(pre.receiver);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  async function handleSubmit() {
    if (!approvals.terms || !approvals.gdpr) {
      alert("Please approve Terms and Conditions and GDPR processing before booking.");
      return;
    }
    if (!pickupSchedule.asap && !pickupSchedule.date) {
      alert('Please select a "Requested pickup date" or check "As soon as possible".');
      return;
    }
    if (!deliverySchedule.asap && !deliverySchedule.date) {
      alert('Please select a "Requested delivery date" or check "As soon as possible".');
      return;
    }
    if (totalWeight > chargeableWeight) {
      alert(
        `Total weight (${Math.round(totalWeight)} kg) exceeds chargeable weight you searched for (${Math.round(
          chargeableWeight
        )} kg). Please adjust.`
      );
      return;
    }

const payload = {
  selected_mode: option.mode,
  price_eur: option.total_price_eur,
  earliest_pickup: option.earliest_pickup_date,
  transit_time_days: option.transit_time_days,
  co2_emissions_grams: option.co2_emissions_grams,

  // <-- VIKTIGT: backend vill ha sender / receiver (inte pickup / delivery)
  sender: {
    country_code:  search.pickup_country,
    postal_code:   search.pickup_postal,
    city:          pickup.city,
    business_name: pickup.business_name,
    address:       pickup.address,
    address2:      pickup.address2 || null,
    contact_name:  pickup.contact_name,
    phone:         pickup.phone,
    email:         pickup.email,
    opening_hours: pickup.opening_hours || null,
    instructions:  pickup.instructions  || null,
  },
  receiver: {
    country_code:  search.delivery_country,
    postal_code:   search.delivery_postal,
    city:          delivery.city,
    business_name: delivery.business_name,
    address:       delivery.address,
    address2:      delivery.address2 || null,
    contact_name:  delivery.contact_name,
    phone:         delivery.phone,
    email:         delivery.email,
    opening_hours: delivery.opening_hours || null,
    instructions:  delivery.instructions  || null,
  },

  goods:        search.goods,
  references:   refs,            // { reference1, reference2 }
  addons,                        // { tail_lift, pre_notice }
  booker,                        // { name, email, phone }
  update_contact: updateContact, // { name, email, phone }

  // datumfält – skicka bara om inte “ASAP”
  asap_pickup: pickupSchedule.asap,
  requested_pickup_date:   pickupSchedule.asap   ? null : pickupSchedule.date,
  asap_delivery: deliverySchedule.asap,
  requested_delivery_date: deliverySchedule.asap ? null : deliverySchedule.date,

  // valfritt om backend använder det
  chargeable_weight: Math.round(chargeableWeight),
};


    const token = getToken();
    if (!token) {
      alert("You are not logged in. Please log in again.");
      return;
    }

    try {
      const res = await fetch(`${API}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const j = JSON.parse(text);
          throw new Error(j.error || text);
        } catch {
          throw new Error(text);
        }
      }
      alert("✅ Booking sent. You'll receive a confirmation email shortly.");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert(`Could not send booking. ${err.message || "Please try again."}`);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-4">📦 Finalize booking</h1>

      <div className="mb-6">
        <SummaryHeader search={search} option={option} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <AddressSection
          title="Pickup address"
          value={pickup}
          onChange={setPickup}
          lockedCountry={search.pickup_country}
          lockedPostal={search.pickup_postal}
          schedule={pickupSchedule}
          onScheduleChange={setPickupSchedule}
          scheduleLabel="Requested pickup date"
        />
        <AddressSection
          title="Delivery address"
          value={delivery}
          onChange={setDelivery}
          lockedCountry={search.delivery_country}
          lockedPostal={search.delivery_postal}
          schedule={deliverySchedule}
          onScheduleChange={setDeliverySchedule}
          scheduleLabel="Requested delivery date"
        />
      </div>

      <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-3">References & add-ons</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Reference 1</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={refs.reference1}
              onChange={(e) => setRefs({ ...refs, reference1: e.target.value })}
              placeholder="Booking reference"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reference 2</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={refs.reference2}
              onChange={(e) => setRefs({ ...refs, reference2: e.target.value })}
              placeholder="Customer reference"
            />
          </div>

          <div className="md:col-span-2 mt-4">
            <h4 className="text-sm font-medium text-gray-700">Add-ons</h4>
            <p className="text-xs text-gray-500 mb-2">Additional costs may apply.</p>

            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={addons.tail_lift}
                  onChange={(e) => setAddons({ ...addons, tail_lift: e.target.checked })}
                />
                <span>Tail-lift</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={addons.pre_notice}
                  onChange={(e) => setAddons({ ...addons, pre_notice: e.target.checked })}
                />
                <span>Pre-notice</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded border bg-white hover:bg-gray-50">
          ← Back
        </button>

        <button
          onClick={handleSubmit}
          disabled={!approvals.terms || !approvals.gdpr}
          className={`px-5 py-2 rounded text-white font-medium shadow ${
            !approvals.terms || !approvals.gdpr ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          ✅ Confirm booking
        </button>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={approvals.terms}
            onChange={(e) => setApprovals({ ...approvals, terms: e.target.checked })}
          />
          <span>
            I approve <a href="/terms" target="_blank" className="text-blue-600 underline">Terms and Conditions</a>
          </span>
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={approvals.gdpr}
            onChange={(e) => setApprovals({ ...approvals, gdpr: e.target.checked })}
          />
          <span>
            I approve EFB <a href="/gdpr" target="_blank" className="text-blue-600 underline">general GDPR terms</a>
          </span>
        </label>
      </div>
    </div>
  );
}
