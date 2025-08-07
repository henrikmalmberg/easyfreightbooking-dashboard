import React, { useState, useEffect } from "react";

const BookingForm = ({ selectedOption, searchData }) => {
  const [formData, setFormData] = useState({
    sender: {
      businessName: "",
      address: "",
      city: searchData?.pickup_city || "",
      contactName: "",
      phone: "",
      email: "",
      openingHours: "",
      instructions: ""
    },
    receiver: {
      businessName: "",
      address: "",
      city: searchData?.delivery_city || "",
      contactName: "",
      phone: "",
      email: "",
      openingHours: "",
      instructions: ""
    },
    goods: {
      weight: searchData?.chargeable_weight || "",
      type: searchData?.goods_type || "",
      length: searchData?.length || "",
      width: searchData?.width || "",
      height: searchData?.height || "",
      reference1: "",
      reference2: "",
      tailLift: false,
      preNotice: false
    }
  });

  const maxAllowedWeight = searchData?.chargeable_weight || 0;

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleGoodsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      goods: {
        ...prev.goods,
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Validering + API-anrop till backend
    console.log("Submitting booking:", formData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto p-6 bg-white rounded shadow space-y-8">
      
      {/* Fraktsammanfattning */}
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-1">Shipping Summary</h2>
        <p>
          {searchData?.pickup_country} ({searchData?.pickup_postal_prefix} {formData.sender.city}) →
          {searchData?.delivery_country} ({searchData?.delivery_postal_prefix} {formData.receiver.city})<br />
          Selected option: {selectedOption?.icon} {selectedOption?.name}<br />
          Price: {selectedOption?.total_price_eur} EUR |
          Pickup: {selectedOption?.earliest_pickup_date} |
          Transit time: {selectedOption?.transit_time_days?.join("–")} days |
          CO₂: {(selectedOption?.co2_emissions_grams / 1000).toFixed(1)} kg
        </p>
      </div>

      {/* Adressuppgifter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {["sender", "receiver"].map((role) => (
          <div key={role}>
            <h3 className="text-md font-semibold mb-2">{role === "sender" ? "Sender" : "Receiver"}</h3>
            <div className="space-y-3">
              <input className="w-full input" placeholder="Business Name" value={formData[role].businessName} onChange={e => handleChange(role, "businessName", e.target.value)} />
              <input className="w-full input" placeholder="Address" value={formData[role].address} onChange={e => handleChange(role, "address", e.target.value)} />
              <input className="w-full input" placeholder="City" value={formData[role].city} onChange={e => handleChange(role, "city", e.target.value)} />
              <div className="flex gap-3">
                <input className="w-1/2 input" placeholder="Country" value={role === "sender" ? searchData?.pickup_country : searchData?.delivery_country} disabled />
                <input className="w-1/2 input" placeholder="Postal Code" value={role === "sender" ? searchData?.pickup_postal_prefix : searchData?.delivery_postal_prefix} disabled />
              </div>
              <input className="w-full input" placeholder="Contact Name" value={formData[role].contactName} onChange={e => handleChange(role, "contactName", e.target.value)} />
              <input className="w-full input" placeholder="Phone" value={formData[role].phone} onChange={e => handleChange(role, "phone", e.target.value)} />
              <input className="w-full input" placeholder="Email" value={formData[role].email} onChange={e => handleChange(role, "email", e.target.value)} />
              <input className="w-full input" placeholder="Opening Hours" value={formData[role].openingHours} onChange={e => handleChange(role, "openingHours", e.target.value)} />
              <textarea className="w-full input" placeholder="Instructions to driver" value={formData[role].instructions} onChange={e => handleChange(role, "instructions", e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      {/* Godsinfo */}
      <div>
        <h3 className="text-md font-semibold mb-2">Goods & Booking</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="w-full input" placeholder="Weight (kg)" value={formData.goods.weight} disabled />
          <input className="w-full input" placeholder="Type" value={formData.goods.type} disabled={!!formData.goods.type} onChange={e => handleGoodsChange("type", e.target.value)} />
          <input className="w-full input" placeholder="Length (cm)" value={formData.goods.length} onChange={e => handleGoodsChange("length", e.target.value)} />
          <input className="w-full input" placeholder="Width (cm)" value={formData.goods.width} onChange={e => handleGoodsChange("width", e.target.value)} />
          <input className="w-full input" placeholder="Height (cm)" value={formData.goods.height} onChange={e => handleGoodsChange("height", e.target.value)} />
          <input className="w-full input" placeholder="Reference 1" value={formData.goods.reference1} onChange={e => handleGoodsChange("reference1", e.target.value)} />
          <input className="w-full input" placeholder="Reference 2" value={formData.goods.reference2} onChange={e => handleGoodsChange("reference2", e.target.value)} />
        </div>

        <div className="flex gap-4 mt-4">
          <label className="flex items-center">
            <input type="checkbox" checked={formData.goods.tailLift} onChange={e => handleGoodsChange("tailLift", e.target.checked)} />
            <span className="ml-2">Tail-lift</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={formData.goods.preNotice} onChange={e => handleGoodsChange("preNotice", e.target.checked)} />
            <span className="ml-2">Pre-notice</span>
          </label>
        </div>
      </div>

      {/* Submit */}
      <div className="pt-6">
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Confirm Booking
        </button>
      </div>
    </form>
  );
};

export default BookingForm;
