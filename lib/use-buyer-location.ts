"use client";
import { useEffect, useState } from "react";
import { inNz, type Point } from "./geo";

// "Near me": the buyer's position stays on their device (rounded to about 100 m) and is only used for distances.
const KEY = "snab-near-me";
const EVENT = "snab-near-me";
function read(): Point | null {
  try { const value = JSON.parse(localStorage.getItem(KEY) || "null"); return value && typeof value.lat === "number" && typeof value.lng === "number" ? value : null; } catch { return null; }
}
function write(point: Point | null) {
  try { if (point) localStorage.setItem(KEY, JSON.stringify(point)); else localStorage.removeItem(KEY); } catch { /* still used for this visit */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: point }));
}

export function useBuyerLocation() {
  const [origin, setOrigin] = useState<Point | null>(null);
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    queueMicrotask(() => setOrigin(read()));
    const update = (event: Event) => setOrigin((event as CustomEvent<Point | null>).detail);
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, []);
  function locate() {
    if (!navigator.geolocation) { setProblem("This browser can’t share your location."); return; }
    setLocating(true); setProblem("");
    navigator.geolocation.getCurrentPosition(position => {
      setLocating(false);
      const point = { lat: Math.round(position.coords.latitude * 1000) / 1000, lng: Math.round(position.coords.longitude * 1000) / 1000 };
      if (!inNz(point)) { setProblem("SNAB only covers New Zealand for now, so distances are hidden."); return; }
      write(point);
    }, error => {
      setLocating(false);
      setProblem(error.code === error.PERMISSION_DENIED ? "Location is turned off for SNAB. You can still browse every sale." : "Couldn’t find your location. Try again outside or later.");
    }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 });
  }
  return { origin, locating, problem, locate, forget: () => write(null) };
}
