import { useEffect, useRef } from "react";
import type * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type Row, num, schoolId, schoolName, region, regionCentre, str } from "@/lib/ps43";

type Props = {
  schools: Row[];
  regions: Row[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function SchoolMap({ schools, regions, selectedId, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const lib = useRef<typeof L | null>(null);
  const onSel = useRef(onSelect);
  onSel.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const Lf = (mod.default ?? mod) as typeof L;
      lib.current = Lf;
      map.current = Lf.map(el.current, { zoomControl: true }).setView([5.7, 12.4], 6);
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 18,
      }).addTo(map.current);
      layer.current = Lf.layerGroup().addTo(map.current);
      draw();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => draw());

  function draw() {
    const Lf = lib.current;
    const g = layer.current;
    if (!Lf || !g) return;
    g.clearLayers();
    const css = getComputedStyle(document.documentElement);
    const primary = css.getPropertyValue("--primary").trim() || "green";
    const warn = css.getPropertyValue("--warn").trim() || "orange";

    // Region markers, listing schools without display coordinates
    for (const r of regions) {
      const c = regionCentre(r);
      if (!c) continue;
      const name = region(r);
      const hidden = schools.filter(
        (s) => region(s) === name && (num(s, "lat_display") == null || num(s, "lng_display") == null),
      );
      const total = num(r, "school_count", "schools", "total_schools") ?? "";
      const m = Lf.circleMarker(c, { radius: 18, color: warn, fillColor: warn, fillOpacity: 0.25, weight: 2 });
      const box = document.createElement("div");
      box.innerHTML = `<strong>${esc(name)}</strong><div style="font-size:12px">${total} schools</div>`;
      if (hidden.length) {
        const p = document.createElement("div");
        p.style.cssText = "margin-top:6px;font-size:12px";
        p.textContent = "Location withheld:";
        box.appendChild(p);
        for (const s of hidden) {
          const b = document.createElement("button");
          b.textContent = schoolName(s);
          b.style.cssText = "display:block;text-decoration:underline;font-size:12px;text-align:left";
          b.onclick = () => onSel.current(schoolId(s));
          box.appendChild(b);
        }
      }
      m.bindPopup(box).bindTooltip(name);
      m.addTo(g);
    }

    for (const s of schools) {
      const lat = num(s, "lat_display");
      const lng = num(s, "lng_display");
      if (lat == null || lng == null) continue;
      const sel = schoolId(s) === selectedId;
      Lf.circleMarker([lat, lng], {
        radius: sel ? 10 : 6,
        color: primary,
        fillColor: sel ? warn : primary,
        fillOpacity: 0.9,
        weight: sel ? 3 : 1,
      })
        .bindTooltip(`${esc(schoolName(s))}${str(s, "top_need") ? " · " + esc(str(s, "top_need")) : ""}`)
        .on("click", () => onSel.current(schoolId(s)))
        .addTo(g);
    }
  }

  return <div ref={el} className="h-full min-h-[420px] w-full rounded-lg border border-border" />;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
