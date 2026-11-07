"use client";

function logLead(clinicId: string, source: "click_to_call" | "whatsapp") {
  fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinicId, source }),
    keepalive: true,
  }).catch(() => {});
}

export function CallButton({ clinicId, phone }: { clinicId: string; phone: string }) {
  return (
    <a
      href={`tel:${phone}`}
      onClick={() => logLead(clinicId, "click_to_call")}
      className="inline-flex items-center justify-center rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
    >
      Call now
    </a>
  );
}

export function WhatsAppButton({ clinicId, phone }: { clinicId: string; phone: string }) {
  const digits = phone.replace(/[^0-9]/g, "");
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => logLead(clinicId, "whatsapp")}
      className="inline-flex items-center justify-center rounded-md bg-green-600 px-5 py-2.5 font-medium text-white hover:bg-green-700"
    >
      WhatsApp us
    </a>
  );
}
