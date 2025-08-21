import React from "react";
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";



/**
 * FAQ – Easy Freight Booking
 * - Tillgänglig: använder <details>/<summary> för keyboard & screen readers
 * - Strukturerad i kategorier
 * - Tailwind-stylad, ren layout
 */

const Section = ({ title, children }) => (
  <section className="bg-white border rounded-lg shadow-sm p-4 md:p-6">
    <h2 className="text-xl md:text-2xl font-bold mb-4">{title}</h2>
    <div className="space-y-3">{children}</div>
  </section>
);

const QA = ({ q, a }) => (
  <details className="group border rounded-lg p-3">
    <summary className="cursor-pointer list-none flex items-start justify-between gap-3">
      <span className="font-medium text-gray-900">{q}</span>
      <span className="shrink-0 text-gray-400 group-open:rotate-180 transition-transform">▾</span>
    </summary>
    <div className="mt-2 text-gray-700">{a}</div>
  </details>
);

export default function FAQ() {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">FAQ</h1>
        <p className="text-gray-600 mt-2">
          Welcome to our FAQ section. Here you’ll find answers to the most common questions about
          Easy Freight Booking – from how to get started, to pricing, booking, and support. If you
          can’t find what you’re looking for, our team is just a message away.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {/* General */}
        <Section title="General">
          <QA
            q="What is Easy Freight Booking?"
            a={
              <>
                Easy Freight Booking is a digital platform that allows you to calculate freight
                rates, compare transport options, and book shipments online within seconds.
              </>
            }
          />
          <QA
            q="Which regions do you cover?"
            a={
              <>
                We focus on shipments <strong>within Europe</strong>, offering reliable solutions
                across multiple countries and destinations.
              </>
            }
          />
          <QA
            q="What type of goods can I ship?"
            a={
              <>
                We handle general cargo, palletized freight, and full truckloads (FTL). Hazardous
                goods and temperature-controlled cargo may require special arrangements – please
                contact us for details.
              </>
            }
          />
          <QA
            q="What shipment sizes do you support?"
            a={
              <>
                From <strong>a single pallet</strong> up to a <strong>full truckload (FTL)</strong>.
                Our pricing engine adapts to both small and large shipments.
              </>
            }
          />
          <QA
            q="Which transport modes are available?"
            a={
              <>
                We provide options for <strong>road freight</strong>,{" "}
                <strong>intermodal rail transport</strong>, <strong>conventional rail transport</strong>, and{" "}
                <strong>ocean freight</strong> – depending on your route and needs.
              </>
            }
          />
          <QA
            q="Why choose Easy Freight Booking?"
            a={
              <>
                Because we make freight <strong>simple, transparent, and digital</strong> – saving
                you time, reducing complexity, and giving you control over your shipments.
              </>
            }
          />
        </Section>

        {/* Booking & Accounts */}
        <Section title="Booking & Accounts">
          <QA
            q="Do I need an account to see prices?"
            a={
              <>
                Yes. To search and view prices you need to log in with your organization account.
                Creating an organization is quick and easy – and once set up, you’ll have full
                access to instant rates and booking.
              </>
            }
          />
          <QA
            q="Can I let suppliers book on my behalf?"
            a={
              <>
                Yes. As a freight-paying organization you can add your suppliers to your account so
                they can book shipments directly under your contract. This is especially practical
                for importers who need suppliers abroad to arrange transport in a simple and
                cost-controlled way.
              </>
            }
          />
          <QA
            q="How quickly can I book a shipment?"
            a={<>In just a few clicks – most users complete their bookings in under one minute.</>}
          />
          <QA
            q="Can I manage multiple shipments at once?"
            a={
              <>
                Yes. Easy Freight Booking is designed for companies handling several shipments to
                different European destinations, making the process simple and efficient.
              </>
            }
          />
          <QA
            q="How do I know which option is best?"
            a={
              <>
                We show you a clear comparison of price, transit time, and transport mode so you can
                choose what fits your needs.
              </>
            }
          />
          <QA
            q="What documents are provided after booking?"
            a={
              <>
                You receive a booking confirmation, shipment details, and all necessary transport
                documents directly to your account and email.
              </>
            }
          />
          <QA
            q="Can I cancel or change a booking?"
            a={
              <>
                Yes. Cancellations and changes are possible within the deadlines shown in your
                booking confirmation. Fees may apply depending on the timing.
              </>
            }
          />
        </Section>

        {/* Pricing & Payment */}
        <Section title="Pricing & Payment">
          <QA
            q="How do I get a price quote?"
            a={
              <>
                Simply enter your shipment details in our online form. Within seconds, you’ll see
                price options for different transport modes.
              </>
            }
          />
          <QA
            q="Are the prices shown final?"
            a={
              <>
                Yes. All prices are instant, transparent, and binding at the time of booking, unless
                your shipment details change.
              </>
            }
          />
          <QA
            q="How do I pay for a booking?"
            a={
              <>
                Currently, all shipments are billed by <strong>invoice</strong>. Online payment
                options may be added in the future.
              </>
            }
          />
        </Section>

        {/* Shipments & Services */}
        <Section title="Shipments & Services">
          <QA
            q="Can I track my shipment?"
            a={
              <>
                Yes. Tracking information is available for most shipments, and we provide status
                updates as your freight moves through the network.
              </>
            }
          />
          <QA
            q="Is my shipment insured?"
            a={
              <>
                Standard liability according to transport conventions is always included. Additional
                cargo insurance can be arranged on request.
              </>
            }
          />
          <QA
            q="Do you offer express freight services?"
            a={
              <>
                Yes. For urgent shipments, we provide express freight options with prioritized
                handling.
              </>
            }
          />
          <QA
            q="What if my shipment exceeds weight or size limits?"
            a={
              <>
                Our system will notify you if your freight exceeds the maximum allowed. For
                oversized loads, contact our support team for a tailored solution.
              </>
            }
          />
        </Section>

        {/* Support */}
        <Section title="Support">
          <QA
            q="How do I contact support?"
            a={
              <>
                Our customer support team is available via <strong>email or chat</strong>. We’re here
                to help you before, during, and after your shipment.
              </>
            }
          />
        </Section>
      </div>
    </div>
  );
}
