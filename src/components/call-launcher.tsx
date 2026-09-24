"use client";
import { useState } from "react";
import { Phone, Video } from "lucide-react";
import { CallRoom } from "./discuss-call";
export function CallLauncher({
  companyId,
  conversationId,
  title,
  type,
}: {
  companyId: string;
  conversationId: string;
  title: string;
  type: "audio" | "video";
}) {
  const [callId, setCallId] = useState("");
  const [error, setError] = useState("");
  async function start() {
    const r = await fetch(`/api/companies/${companyId}/calls`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, callType: type }),
    });
    const j = await r.json();
    if (r.ok) setCallId(j.call.id);
    else setError(j.error);
  }
  return (
    <>
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        className="btn btn-secondary !p-2.5"
        title={type === "audio" ? "Audio call" : "Video call"}
        onClick={start}
      >
        {type === "audio" ? <Phone size={17} /> : <Video size={17} />}
      </button>
      {callId && (
        <CallRoom
          companyId={companyId}
          callId={callId}
          mode={type}
          title={title}
          onClose={() => setCallId("")}
        />
      )}
    </>
  );
}
