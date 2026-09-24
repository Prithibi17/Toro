"use client";
import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  ScreenShare,
  Video,
  X,
} from "lucide-react";
import { clientDb } from "@/lib/firebase-client";
export function CallRoom({
  companyId,
  callId,
  mode,
  title,
  onClose,
}: {
  companyId: string;
  callId: string;
  mode: "audio" | "video";
  title: string;
  onClose: () => void;
}) {
  const local = useRef<HTMLVideoElement>(null);
  const remote = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const [ready, setReady] = useState(false);
  const [cam, setCam] = useState(mode === "video");
  const [mic, setMic] = useState(true);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [started, setStarted] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    prepare();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      cleanup();
    };
  }, []);
  async function prepare(deviceId?: string) {
    try {
      cleanupMedia();
      const s = await navigator.mediaDevices.getUserMedia({
        video:
          mode === "video"
            ? deviceId
              ? { deviceId: { exact: deviceId } }
              : true
            : false,
        audio: true,
      });
      stream.current = s;
      if (local.current) local.current.srcObject = s;
      setDevices(await navigator.mediaDevices.enumerateDevices());
      setReady(true);
      setError("");
    } catch {
      setReady(false);
      setError(
        mode === "video"
          ? "Camera or microphone access was denied. You may retry or join audio-only."
          : "Microphone access was denied. Check browser permissions and retry.",
      );
    }
  }
  function cleanupMedia() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }
  function cleanup() {
    cleanupMedia();
    pc.current?.close();
  }
  function toggle(kind: "video" | "audio") {
    const track = stream.current?.getTracks().find((t) => t.kind === kind);
    if (track) {
      track.enabled = !track.enabled;
      if (kind === "video") setCam(track.enabled);
      else setMic(track.enabled);
    }
  }
  async function join() {
    if (!clientDb || !stream.current) return;
    const sessionId = crypto.randomUUID();
    const joinedResponse = await fetch(
      `/api/companies/${companyId}/calls/${callId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "join", sessionId }),
      },
    );
    if (!joinedResponse.ok) {
      setError((await joinedResponse.json()).error);
      return;
    }
    setJoined(true);
    setStarted(Date.now());
    const callRef = doc(clientDb, "companies", companyId, "calls", callId);
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    pc.current = peer;
    stream.current
      .getTracks()
      .forEach((t) => peer.addTrack(t, stream.current!));
    peer.ontrack = (e) => {
      if (remote.current) remote.current.srcObject = e.streams[0];
    };
    peer.onconnectionstatechange = () => {
      if (["failed", "disconnected"].includes(peer.connectionState))
        setError(
          "The media connection is unstable. Reconnecting may be required.",
        );
    };
    const signalRef = doc(callRef, "signals", "session");
    const existing = await getDoc(signalRef);
    if (!existing.exists() || !existing.data()?.offer) {
      const candidates = collection(callRef, "offerCandidates");
      peer.onicecandidate = (e) => {
        if (e.candidate) addDoc(candidates, e.candidate.toJSON());
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await setDoc(signalRef, { offer: { type: offer.type, sdp: offer.sdp } });
      onSnapshot(signalRef, (s) => {
        const answer = s.data()?.answer;
        if (answer && !peer.currentRemoteDescription)
          peer.setRemoteDescription(answer);
      });
      onSnapshot(collection(callRef, "answerCandidates"), (s) =>
        s.docChanges().forEach((c) => {
          if (c.type === "added") peer.addIceCandidate(c.doc.data());
        }),
      );
    } else {
      await peer.setRemoteDescription(existing.data()!.offer);
      const candidates = collection(callRef, "answerCandidates");
      peer.onicecandidate = (e) => {
        if (e.candidate) addDoc(candidates, e.candidate.toJSON());
      };
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await setDoc(
        signalRef,
        { answer: { type: answer.type, sdp: answer.sdp } },
        { merge: true },
      );
      onSnapshot(collection(callRef, "offerCandidates"), (s) =>
        s.docChanges().forEach((c) => {
          if (c.type === "added") peer.addIceCandidate(c.doc.data());
        }),
      );
    }
  }
  async function leave() {
    await fetch(`/api/companies/${companyId}/calls/${callId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "leave", sessionId: "" }),
    });
    cleanup();
    onClose();
  }
  async function share() {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const track = display.getVideoTracks()[0];
      const sender = pc.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(track);
      track.onended = () => {
        const camera = stream.current?.getVideoTracks()[0];
        if (sender && camera) sender.replaceTrack(camera);
      };
    } catch {}
  }
  const duration = new Date(Math.max(0, now - started))
    .toISOString()
    .slice(11, 19);
  return (
    <div className="fixed inset-0 z-[60] bg-[#09100e] text-white">
      <header className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <div>
          <b>{title}</b>
          <p className="text-xs text-white/50">
            {joined
              ? `${duration} · WebRTC connected`
              : `Prepare for your ${mode} call`}
          </p>
        </div>
        <button onClick={joined ? leave : onClose}>
          <X />
        </button>
      </header>
      <main className="grid h-[calc(100vh-132px)] place-items-center overflow-auto p-5">
        {!joined ? (
          <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.4fr_.8fr]">
            <div className="relative aspect-video overflow-hidden rounded-3xl bg-black">
              {mode === "video" && cam ? (
                <video
                  ref={local}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <span className="grid h-24 w-24 place-items-center rounded-full bg-[var(--accent)] text-4xl font-bold">
                    {title[0]}
                  </span>
                </div>
              )}
            </div>
            <div className="self-center">
              <h1 className="text-3xl font-extrabold">Ready to join?</h1>
              <p className="mt-2 text-white/55">{title}</p>
              <div className="mt-6 space-y-3">
                {mode === "video" && (
                  <select
                    className="input !bg-white/10 !text-white"
                    onChange={(e) => prepare(e.target.value)}
                  >
                    <option value="">Default camera</option>
                    {devices
                      .filter((d) => d.kind === "videoinput")
                      .map((d) => (
                        <option
                          className="text-black"
                          key={d.deviceId}
                          value={d.deviceId}
                        >
                          {d.label || "Camera"}
                        </option>
                      ))}
                  </select>
                )}
                <p className="text-sm text-white/50">
                  {devices.filter((d) => d.kind === "audioinput").length || 0}{" "}
                  microphone(s) detected
                </p>
              </div>
              {error && (
                <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">
                  {error}
                </p>
              )}
              <div className="mt-7 flex gap-3">
                <button
                  className="btn btn-secondary !border-white/20 !bg-white/10 !text-white"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!ready}
                  onClick={join}
                >
                  <Video size={18} />
                  Join call
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid w-full max-w-6xl gap-4 md:grid-cols-2">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
              {mode === "video" && cam ? (
                <video
                  ref={local}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <span className="grid h-24 w-24 place-items-center rounded-full bg-[var(--accent)] text-4xl font-bold">
                    Y
                  </span>
                </div>
              )}
              <span className="absolute bottom-3 left-3 rounded bg-black/50 px-2 py-1 text-xs">
                You
              </span>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
              <video
                ref={remote}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-3 left-3 rounded bg-black/50 px-2 py-1 text-xs">
                Remote participant
              </span>
            </div>
          </div>
        )}
      </main>
      <footer className="flex h-16 items-center justify-center gap-3 border-t border-white/10">
        <button
          className={`rounded-full p-3 ${mic ? "bg-white/10" : "bg-red-500"}`}
          onClick={() => toggle("audio")}
        >
          {mic ? <Mic /> : <MicOff />}
        </button>
        {mode === "video" && (
          <button
            className={`rounded-full p-3 ${cam ? "bg-white/10" : "bg-red-500"}`}
            onClick={() => toggle("video")}
          >
            {cam ? <Camera /> : <CameraOff />}
          </button>
        )}
        {joined && (
          <button className="rounded-full bg-white/10 p-3" onClick={share}>
            <ScreenShare />
          </button>
        )}
        {joined && (
          <button className="rounded-full bg-red-500 p-3" onClick={leave}>
            <PhoneOff />
          </button>
        )}
      </footer>
    </div>
  );
}
