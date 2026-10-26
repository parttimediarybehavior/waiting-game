import { count } from "./format.js";
const NS = "http://www.w3.org/2000/svg";
const colors = [
  "#dc7755",
  "#6f9984",
  "#d6b15c",
  "#7995a5",
  "#ac8caa",
  "#ae9d77",
];
function avatar(color, barista = false) {
  return `<ellipse cy="22" rx="15" ry="5" fill="#334c3420"/><circle class="state-ring" cy="4" r="19" fill="none" stroke="${barista ? "#567b63" : "#cf704e"}" stroke-width="2"/><path d="M-13 20v-8a13 13 0 0 1 26 0v8" fill="${color}"/><circle cy="-3" r="10" fill="#dca987"/><path d="M-10-5q1-14 12-8q9 3 8 12l-6-6q-6 5-14 2" fill="#3e4033"/><circle cx="-3" cy="-2" r="1" fill="#34382e"/><circle cx="4" cy="-2" r="1" fill="#34382e"/><path d="M-2 3q3 2 5-1" fill="none" stroke="#8e5e48" stroke-width="1.2"/>${barista ? '<path d="M-7 9h14v13H-7z" fill="#f2e8d0"/><path d="M-5 12h10" stroke="#b7ab92"/>' : ""}`;
}
function plant(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="25" rx="25" ry="8" fill="#71866520"/><path d="M-14 0h28l-4 27h-20z" fill="#cb8965"/><path d="M0 3v-45M0-8q-35-1-23-24q24 0 23 24M0-19q28-5 22-30q-24 3-22 30M0-31q-21-8-13-27q19 3 13 27" fill="#74966a" stroke="#66835b" stroke-width="2"/></g>`;
}
export function createScene(container) {
  container.innerHTML = `<svg viewBox="0 0 800 450" aria-hidden="true"><defs><pattern id="floor" width="70" height="45" patternUnits="userSpaceOnUse"><path d="M0 45h70V0" fill="none" stroke="#dce3d1" stroke-width="1"/></pattern><pattern id="canopy" width="50" height="40" patternUnits="userSpaceOnUse"><rect width="25" height="40" fill="#d87d54"/><rect x="25" width="25" height="40" fill="#f3dfb8"/></pattern></defs><rect width="800" height="450" fill="#eaf0df"/><path d="M0 105h800v345H0z" fill="url(#floor)"/><path d="M0 105h800" stroke="#cdd8c1"/>
 <rect x="154" y="7" width="492" height="81" rx="3" fill="#e1d4b9"/><rect x="163" y="13" width="474" height="69" fill="#fbf4de"/><text x="400" y="42" text-anchor="middle" fill="#46533c" font-family="Georgia,serif" font-size="26" letter-spacing="4">SLOW &amp; STEADY</text><text x="400" y="64" text-anchor="middle" fill="#75816a" font-family="Arial,sans-serif" font-size="8" letter-spacing="3">GOOD COFFEE • A LITTLE PATIENCE</text><path d="M140 78h520l13 26H127z" fill="url(#canopy)" stroke="#c79164"/><path d="M127 104h546v12q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0q-12 13-25 0z" fill="url(#canopy)"/>
 <rect x="36" y="25" width="82" height="99" rx="3" fill="#b49a77"/><rect x="41" y="30" width="72" height="89" fill="#405c46"/><text x="77" y="51" text-anchor="middle" fill="#f1ecd7" font-family="Georgia,serif" font-size="12" font-style="italic">on the menu</text><path d="M52 61h49M52 79h30M52 94h38" stroke="#b6c4a9" stroke-width="2"/><text x="99" y="80" text-anchor="end" fill="#d6dfc5" font-size="8">☕</text>
 <g transform="translate(711 48)"><circle r="27" fill="#f8f2df" stroke="#a3ae8f" stroke-width="4"/><path d="M0-18V0l12 7" fill="none" stroke="#5e7155" stroke-width="2"/><circle r="3" fill="#5e7155"/></g>
 <g id="stations"></g><rect x="138" y="173" width="524" height="55" rx="4" fill="#b88759"/><path d="M148 183h504v34H148z" fill="#d2ab79"/><path d="M157 183v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34m24-34v34" stroke="#c49a67"/><rect x="128" y="164" width="544" height="14" rx="4" fill="#eed9b0" stroke="#b5966d"/>
 ${plant(77, 192, 1.12)}${plant(723, 194, 0.94)}<g transform="translate(70 342)"><ellipse cy="12" rx="42" ry="22" fill="#41563415"/><circle cy="-7" r="34" fill="#d9c6a0" stroke="#c1ae89" stroke-width="3"/><circle cy="-7" r="7" fill="#f4ead4"/><circle cy="-7" r="4" fill="#805b40"/><path d="M-42-6h-12m96 0h12M0 37v12" stroke="#8a9c76" stroke-width="14" stroke-linecap="round"/></g>
 <g transform="translate(728 342)"><ellipse cy="12" rx="42" ry="22" fill="#41563415"/><circle cy="-7" r="34" fill="#d9c6a0" stroke="#c1ae89" stroke-width="3"/><path d="M-42-6h-12m96 0h12M0 37v12" stroke="#8a9c76" stroke-width="14" stroke-linecap="round"/><rect x="-11" y="-19" width="22" height="24" rx="2" fill="#f4ead4" transform="rotate(18)"/></g>
 <g id="queue-guides"></g><g id="people"></g><text id="overflow" x="400" y="435" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#5c7055"></text><g id="welcome"><rect x="258" y="286" width="284" height="72" rx="10" fill="#f9f6e9" fill-opacity=".9" stroke="#d6ddc9"/><text x="400" y="316" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="#53694e">A fresh pot. A clean slate.</text><text x="400" y="338" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#6d7d65">Open the café and see who comes through.</text></g></svg>`;
  const svg = container.querySelector("svg"),
    people = svg.querySelector("#people");
  svg.insertBefore(
    svg.querySelector("#stations"),
    svg.querySelector("#queue-guides"),
  );
  let key = "",
    nodes = new Map();
  return function draw(run, s) {
    const n = run.settings.baristas,
      stationX = (i) => 190 + (i + 0.5) * (420 / n),
      nextKey = run.demandKey + JSON.stringify(run.settings);
    if (key !== nextKey) {
      key = nextKey;
      people.replaceChildren();
      nodes = new Map();
      svg.querySelector("#stations").innerHTML = Array.from(
        { length: n },
        (_, i) =>
          `<g transform="translate(${stationX(i)} 142)">${avatar("#64836c", true)}<text x="0" y="59" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#5a543d">BARISTA ${i + 1}</text><rect x="-19" y="72" width="38" height="4" rx="2" fill="#d7ccb3"/><rect id="progress-${i}" x="-19" y="72" width="0" height="4" rx="2" fill="#5a8369"/></g>`,
      ).join("");
      svg.querySelector("#queue-guides").innerHTML =
        run.settings.policy === "shared"
          ? '<path d="M180 280h430M180 335h430M180 390h430" stroke="#b7c8aa" stroke-dasharray="3 8" fill="none"/>'
          : Array.from(
              { length: n },
              (_, i) =>
                `<path d="M${stationX(i)} 266v132" stroke="#b7c8aa" stroke-dasharray="3 8" fill="none"/>`,
            ).join("");
    }
    svg.querySelector("#welcome").style.display = s.arrived === 0 ? "" : "none";
    for (let i = 0; i < n; i++) {
      const c = s.servingCustomers.find((c) => c.server === i);
      svg
        .querySelector(`#progress-${i}`)
        .setAttribute(
          "width",
          c
            ? (38 *
                (s.time -
                  (s.time >= c.firstFinish ? c.firstFinish : c.start))) /
                c.duration
            : 0,
        );
    }
    const displayWait =
      run.settings.policy === "shared"
        ? s.waitingCustomers.slice(0, 21)
        : s.waitingCustomers.filter(
            (c) =>
              s.waitingCustomers.filter((x) => x.line === c.line).indexOf(c) <
              4,
          );
    const visible = new Set();
    for (const c of run.customers) {
      if (c.arrival > s.time) continue;
      let x, y, state;
      if (s.servingCustomers.includes(c)) {
        x = stationX(c.server);
        y = 245;
        state = c.remake && s.time >= c.firstFinish ? "remake" : "service";
      } else if (displayWait.includes(c)) {
        const idx =
          run.settings.policy === "shared"
            ? displayWait.indexOf(c)
            : displayWait.filter((x) => x.line === c.line).indexOf(c);
        x =
          run.settings.policy === "shared"
            ? 195 + (idx % 7) * 67
            : stationX(c.line);
        y =
          run.settings.policy === "shared"
            ? 290 + Math.floor(idx / 7) * 51
            : 292 + idx * 39;
        state = "wait";
      } else {
        if (s.phase === "complete") continue;
        const departure = c.leave ?? c.finish;
        if (departure === null || s.time < departure || s.time - departure > 12)
          continue;
        x = c.leave !== null ? 780 : 20;
        y = 260 + Math.min(130, (s.time - departure) * 10);
        state = "exit";
      }
      visible.add(c.id);
      let node = nodes.get(c.id);
      if (!node) {
        node = document.createElementNS(NS, "g");
        node.classList.add("person");
        node.innerHTML = avatar(colors[c.id % colors.length]);
        node.style.transform = "translate(400px, 460px)";
        people.append(node);
        nodes.set(c.id, node);
      }
      node.style.opacity =
        state === "exit"
          ? String(Math.max(0, 1 - (s.time - (c.leave ?? c.finish)) / 12))
          : "1";
      node.style.transform = `translate(${x}px, ${y}px)`;
      node
        .querySelector(".state-ring")
        .setAttribute(
          "stroke",
          state === "service"
            ? "#4b8570"
            : state === "remake"
              ? "#9266a6"
              : "#d95f43",
        );
    }
    for (const [id, node] of nodes)
      if (!visible.has(id)) {
        node.remove();
        nodes.delete(id);
      }
    svg.querySelector("#overflow").textContent =
      s.waiting > displayWait.length
        ? `+ ${s.waiting - displayWait.length} more waiting · every customer is included in the results`
        : "";
    container.setAttribute(
      "aria-label",
      `${count(n, "barista")}. ${count(s.serving, "customer")} being served, ${s.waiting} waiting, ${s.served} served, ${s.left} left.`,
    );
  };
}
