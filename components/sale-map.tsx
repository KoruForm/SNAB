"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import type { Category } from "../lib/drafts/types";
import { AREA_RADIUS_M, HAMILTON, type Point } from "../lib/geo";
import type { BuyerSale } from "../lib/mock/catalogue";

// Real maps: MapLibre with OpenFreeMap's free tiles (no key). NEXT_PUBLIC_MAP_STYLE_URL swaps the style.
const STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron";
type MapLibre = typeof import("maplibre-gl");

// Starts MapLibre in the container; `failed` covers no WebGL or a style that won't load.
function useMapLibre(container: RefObject<HTMLDivElement | null>, zoom: number) {
  const [map, setMap] = useState<{ map: MapLibreMap; lib: MapLibre } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let created: MapLibreMap | undefined; let active = true;
    import("maplibre-gl").then(lib => {
      if (!active || !container.current) return;
      lib.setWorkerUrl(`/maplibre/${lib.getVersion()}/maplibre-gl-worker.mjs`);
      try {
        created = new lib.Map({ container: container.current, style: STYLE_URL, center: [HAMILTON.lng, HAMILTON.lat], zoom, attributionControl: { compact: true }, cooperativeGestures: true, maxPitch: 0 });
      } catch { setFailed(true); return; }
      created.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      const instance = created;
      let loaded = false;
      instance.on("load", () => { loaded = true; if (active) setMap({ map: instance, lib }); });
      // Only a style that never loads counts; a missing tile (an error with a sourceId) just leaves a gap.
      instance.on("error", event => { if (active && !loaded && !("sourceId" in event)) setFailed(true); });
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; created?.remove(); };
  }, [container, zoom]);
  return { ready: map, failed };
}

function circle(center: Point, metres: number): [number, number][] {
  const dLat = metres / 111_320, dLng = metres / (111_320 * Math.cos(center.lat * Math.PI / 180));
  return Array.from({ length: 49 }, (_, n) => { const a = (n / 48) * 2 * Math.PI; return [center.lng + dLng * Math.cos(a), center.lat + dLat * Math.sin(a)]; });
}
function pinImage(sale: BuyerSale, selected: boolean): string {
  const name = selected ? "selected" : sale.state === "closed" ? "closed" : ({ Tools: "tools", Books: "books", Furniture: "furniture" } as Partial<Record<Category, string>>)[sale.coverCategory] || "sale";
  return `/brand/map-pins/${name}.svg`;
}
function categoryImage(category: Category): string { return `/brand/categories/${category === "Other" ? "free" : category.toLowerCase()}.svg`; }
function button(className: string, label: string, image: string, onClick?: () => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button"; el.className = className; el.setAttribute("aria-label", label);
  const img = document.createElement("img"); img.src = image; img.alt = ""; el.append(img);
  if (onClick) el.addEventListener("click", event => { event.stopPropagation(); onClick(); });
  return el;
}
function youMarker(lib: MapLibre, origin: Point): Marker {
  const dot = document.createElement("span"); dot.className = "you-dot"; dot.setAttribute("aria-label", "You are here");
  return new lib.Marker({ element: dot }).setLngLat([origin.lng, origin.lat]);
}
function MapFallback() { return <div className="map-fallback" role="status">The map couldn’t load on this device. Every sale is still in the list.</div>; }

// Buyers' map. Sales the seller allows show an exact pin; the rest show a soft circle around their area,
// drawn from the area point the server sends, so the real spot is never on the phone.
export function SaleMap({ sales, selected, onSelect, origin, label = "Map of sales", zoom = 11.5 }: { sales: BuyerSale[]; selected?: string; onSelect?: (id: string) => void; origin?: Point | null; label?: string; zoom?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const { ready, failed } = useMapLibre(container, zoom);
  const placed = sales.filter(sale => sale.point);
  const placedKey = placed.map(sale => `${sale.id}:${sale.point!.lat},${sale.point!.lng}`).join("|");
  const select = useRef(onSelect);
  useEffect(() => { select.current = onSelect; });

  // Frame every sale (and the buyer) when the set of sales changes, not when one is tapped.
  useEffect(() => {
    if (!ready) return;
    const { map, lib } = ready;
    const points = [...placed.map(sale => sale.point!), ...(origin ? [origin] : [])];
    if (!points.length) return;
    const bounds = new lib.LngLatBounds();
    for (const p of points) bounds.extend([p.lng, p.lat]);
    if (placed.some(sale => !sale.exactPoint)) for (const sale of placed) if (!sale.exactPoint) for (const [lng, lat] of circle(sale.point!, AREA_RADIUS_M).filter((_, n) => n % 12 === 0)) bounds.extend([lng, lat]);
    map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, placedKey, origin?.lat, origin?.lng]);

  useEffect(() => {
    if (!ready) return;
    const { map, lib } = ready;
    const areas = placed.filter(sale => !sale.exactPoint);
    const data: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: areas.map(sale => ({ type: "Feature", properties: { id: sale.id, selected: sale.id === selected }, geometry: { type: "Polygon", coordinates: [circle(sale.point!, AREA_RADIUS_M)] } })) };
    const source = map.getSource("sale-areas") as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      map.addSource("sale-areas", { type: "geojson", data });
      map.addLayer({ id: "sale-area-fill", type: "fill", source: "sale-areas", paint: { "fill-color": ["case", ["get", "selected"], "#315945", "#ffd64d"], "fill-opacity": 0.22 } });
      map.addLayer({ id: "sale-area-line", type: "line", source: "sale-areas", paint: { "line-color": ["case", ["get", "selected"], "#315945", "#b8902a"], "line-width": 2, "line-dasharray": [2, 2] } });
      map.on("click", "sale-area-fill", event => { const id = event.features?.[0]?.properties?.id; if (typeof id === "string") select.current?.(id); });
    }
    // Area badges share a grid point when sales are in the same area; fan them out so each stays tappable.
    const seen = new Map<string, number>();
    const markers = placed.map(sale => {
      const key = `${sale.point!.lat},${sale.point!.lng}`; const n = seen.get(key) ?? 0; seen.set(key, n + 1);
      const isSelected = sale.id === selected;
      const el = sale.exactPoint
        ? button(`map-pin${isSelected ? " selected-pin" : ""}`, `${sale.title}, ${sale.state}`, pinImage(sale, isSelected), () => select.current?.(sale.id))
        : button(`map-area${isSelected ? " selected-area" : ""}`, `${sale.title}, ${sale.state}, somewhere in ${sale.town || "this area"}`, categoryImage(sale.coverCategory), () => select.current?.(sale.id));
      if (!onSelect) el.tabIndex = -1;
      el.setAttribute("aria-pressed", String(isSelected));
      return new lib.Marker({ element: el, anchor: sale.exactPoint ? "bottom" : "center", offset: [n * 22, 0] }).setLngLat([sale.point!.lng, sale.point!.lat]).addTo(map);
    });
    if (origin) markers.push(youMarker(lib, origin).addTo(map));
    return () => { for (const marker of markers) marker.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, placedKey, selected, origin?.lat, origin?.lng]);

  return <div className="sale-map-wrap">{failed ? <MapFallback /> : <div ref={container} className="sale-map" role="region" aria-label={label} />}</div>;
}

// Seller's pin: search fills it in, and a tap or drag puts it exactly on the house.
export function LocationPicker({ point, onChange, onUnavailable }: { point: Point | null; onChange: (point: Point) => void; onUnavailable?: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const { ready, failed } = useMapLibre(container, 12);
  const marker = useRef<Marker | null>(null);
  const change = useRef(onChange);
  useEffect(() => { change.current = onChange; });
  useEffect(() => { if (failed) onUnavailable?.(); }, [failed, onUnavailable]);
  useEffect(() => {
    if (!ready) return;
    const { map } = ready;
    const place = (event: { lngLat: { lat: number; lng: number } }) => change.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    map.on("click", place);
    return () => { map.off("click", place); };
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    const { map, lib } = ready;
    if (!point) { marker.current?.remove(); marker.current = null; return; }
    if (!marker.current) {
      const img = document.createElement("img"); img.src = "/brand/map-pins/selected.svg"; img.alt = ""; img.className = "map-pin picker-pin";
      marker.current = new lib.Marker({ element: img, anchor: "bottom", draggable: true }).setLngLat([point.lng, point.lat]).addTo(map);
      marker.current.on("dragend", () => { const at = marker.current!.getLngLat(); change.current({ lat: at.lat, lng: at.lng }); });
    } else marker.current.setLngLat([point.lng, point.lat]);
    if (!map.getBounds().contains([point.lng, point.lat]) || map.getZoom() < 15) map.jumpTo({ center: [point.lng, point.lat], zoom: Math.max(map.getZoom(), 16) });
  }, [ready, point]);
  return <div className="sale-map-wrap">{failed ? <MapFallback /> : <div ref={container} className="sale-map picker-map" role="region" aria-label="Map: tap where your sale is, or drag the pin" />}</div>;
}
