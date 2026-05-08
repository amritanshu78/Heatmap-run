const seedRoutes = [
  { id: 1, name: "Morning waterfront run", city: "Mumbai", sport: "run", distance: 8.4, minutes: 47, elevation: 82, points: [[.18,.72],[.25,.66],[.33,.61],[.43,.56],[.52,.48],[.61,.42],[.72,.37],[.82,.30]] },
  { id: 2, name: "Hill repeat circuit", city: "Pune", sport: "run", distance: 6.1, minutes: 39, elevation: 214, points: [[.31,.74],[.35,.64],[.41,.58],[.38,.49],[.45,.41],[.52,.50],[.47,.59],[.39,.67]] },
  { id: 3, name: "Sunday lake ride", city: "Bengaluru", sport: "ride", distance: 36.8, minutes: 105, elevation: 318, points: [[.12,.45],[.24,.39],[.38,.34],[.51,.33],[.68,.37],[.84,.46],[.77,.58],[.61,.63],[.44,.60],[.27,.52]] },
  { id: 4, name: "Office commute walk", city: "Delhi", sport: "walk", distance: 3.2, minutes: 41, elevation: 22, points: [[.42,.82],[.45,.75],[.49,.69],[.53,.63],[.58,.58],[.62,.52]] },
  { id: 5, name: "Coastal tempo", city: "Goa", sport: "run", distance: 10.2, minutes: 54, elevation: 45, points: [[.16,.22],[.25,.28],[.36,.32],[.48,.35],[.61,.36],[.73,.39],[.86,.44]] },
  { id: 6, name: "Airport endurance ride", city: "Hyderabad", sport: "ride", distance: 52.6, minutes: 148, elevation: 410, points: [[.20,.60],[.27,.52],[.38,.47],[.48,.40],[.57,.31],[.70,.25],[.80,.31],[.74,.43],[.62,.53],[.44,.61]] },
];

let routes = loadRoutes();
let selectedId = routes[0].id;
let zoom = 1;
let filter = "all";
let query = "";
let deferredInstallPrompt = null;

const views = {
  heatmap: document.getElementById("heatmapView"),
  analytics: document.getElementById("analyticsView"),
  routes: document.getElementById("routesView"),
  settings: document.getElementById("settingsView"),
};

const viewTitles = {
  heatmap: "Heatmap",
  analytics: "Analytics",
  routes: "Routes",
  settings: "Setup",
};

const heatCanvas = document.getElementById("heatCanvas");
const barCanvas = document.getElementById("barCanvas");
const donutCanvas = document.getElementById("donutCanvas");

function loadRoutes() {
  const stored = localStorage.getItem("heatrun.routes");
  return stored ? JSON.parse(stored) : seedRoutes;
}

function saveRoutes() {
  localStorage.setItem("heatrun.routes", JSON.stringify(routes));
}

function visibleRoutes() {
  return routes.filter((route) => {
    const matchesSport = filter === "all" || route.sport === filter;
    const haystack = `${route.name} ${route.city} ${route.sport}`.toLowerCase();
    return matchesSport && haystack.includes(query.toLowerCase());
  });
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, Math.floor(rect.width * ratio));
  canvas.height = Math.max(260, Math.floor(rect.height * ratio));
}

function drawHeatmap() {
  resizeCanvas(heatCanvas);
  const ctx = heatCanvas.getContext("2d");
  const width = heatCanvas.width;
  const height = heatCanvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#11181d";
  ctx.fillRect(0, 0, width, height);
  drawMapBase(ctx, width, height);

  const scale = Math.min(width, height) * zoom;
  const offsetX = (width - scale) / 2;
  const offsetY = (height - scale * .65) / 2;

  visibleRoutes().forEach((route) => {
    const intensity = route.sport === "ride" ? .72 : route.sport === "walk" ? .42 : 1;
    drawRouteGlow(ctx, route, offsetX, offsetY, scale, intensity);
  });

  const selected = routes.find((route) => route.id === selectedId) || routes[0];
  if (selected) drawRouteLine(ctx, selected, offsetX, offsetY, scale);
}

function drawMapBase(ctx, width, height) {
  ctx.strokeStyle = "rgba(255,255,255,.035)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(145,160,154,.18)";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  const roads = [
    [[.05,.75],[.22,.68],[.42,.66],[.62,.58],[.86,.52]],
    [[.12,.25],[.28,.34],[.52,.36],[.75,.29],[.96,.24]],
    [[.48,.05],[.52,.23],[.50,.42],[.56,.66],[.68,.92]],
    [[.06,.48],[.24,.52],[.41,.47],[.62,.44],[.90,.39]],
  ];
  roads.forEach((road) => path(ctx, road, width, height, 1));
}

function path(ctx, points, width, height, yScale = .65) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    const px = x * width;
    const py = y * height * yScale + height * (1 - yScale) / 2;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
}

function routePoint(point, offsetX, offsetY, scale) {
  return [offsetX + point[0] * scale, offsetY + point[1] * scale * .65];
}

function drawRouteGlow(ctx, route, offsetX, offsetY, scale, intensity) {
  const colors = route.sport === "ride"
    ? ["rgba(56,189,248,.22)", "rgba(56,189,248,.03)"]
    : route.sport === "walk"
      ? ["rgba(247,185,85,.2)", "rgba(247,185,85,.02)"]
      : ["rgba(52,211,153,.28)", "rgba(255,107,95,.035)"];

  route.points.forEach((point) => {
    const [x, y] = routePoint(point, offsetX, offsetY, scale);
    const radius = Math.max(44, route.distance * 4.2) * intensity * zoom;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawRouteLine(ctx, route, offsetX, offsetY, scale) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#f7b955";
  ctx.beginPath();
  route.points.forEach((point, index) => {
    const [x, y] = routePoint(point, offsetX, offsetY, scale);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function renderActivityList() {
  const list = document.getElementById("activityList");
  list.innerHTML = "";
  visibleRoutes().forEach((route) => {
    const item = document.createElement("button");
    item.className = `timeline-item ${route.id === selectedId ? "active" : ""}`;
    item.innerHTML = `<span><strong>${route.name}</strong><small>${route.city} · ${route.distance} km</small></span><span class="sport-pill">${route.sport}</span>`;
    item.addEventListener("click", () => {
      selectedId = route.id;
      renderAll();
    });
    list.appendChild(item);
  });
}

function renderStats() {
  const shown = visibleRoutes();
  const selected = routes.find((route) => route.id === selectedId) || shown[0] || routes[0];
  const total = shown.reduce((sum, route) => sum + route.distance, 0);
  document.getElementById("totalDistance").textContent = `${total.toFixed(1)} km`;
  document.getElementById("activityCount").textContent = shown.length;
  document.getElementById("selectedName").textContent = selected.name;
  document.getElementById("selectedMeta").textContent = `${selected.distance} km · ${selected.sport} · ${selected.minutes} min`;
  document.getElementById("selectedPace").textContent = selected.sport === "ride"
    ? `${(selected.distance / (selected.minutes / 60)).toFixed(1)} km/h`
    : pace(selected.minutes, selected.distance);
  document.getElementById("selectedElevation").textContent = `${selected.elevation} m`;
}

function pace(minutes, distance) {
  const paceValue = minutes / distance;
  const mins = Math.floor(paceValue);
  const secs = Math.round((paceValue - mins) * 60).toString().padStart(2, "0");
  return `${mins}:${secs} /km`;
}

function drawBars() {
  resizeCanvas(barCanvas);
  const ctx = barCanvas.getContext("2d");
  const width = barCanvas.width;
  const height = barCanvas.height;
  const weeks = [18, 24, 21, 33, 28, 42, 37, routes.reduce((sum, route) => sum + route.distance, 0)];
  const max = Math.max(...weeks) * 1.15;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#12181d";
  ctx.fillRect(0, 0, width, height);

  const gap = 18;
  const barWidth = (width - gap * (weeks.length + 1)) / weeks.length;
  weeks.forEach((value, index) => {
    const barHeight = (height - 64) * (value / max);
    const x = gap + index * (barWidth + gap);
    const y = height - 34 - barHeight;
    const gradient = ctx.createLinearGradient(0, y, 0, height);
    gradient.addColorStop(0, "#34d399");
    gradient.addColorStop(1, "#38bdf8");
    ctx.fillStyle = gradient;
    roundRect(ctx, x, y, barWidth, barHeight, 10);
    ctx.fill();
    ctx.fillStyle = "#91a09a";
    ctx.font = `${14 * (window.devicePixelRatio || 1)}px sans-serif`;
    ctx.fillText(`W${index + 1}`, x + 4, height - 10);
  });
}

function drawDonut() {
  resizeCanvas(donutCanvas);
  const ctx = donutCanvas.getContext("2d");
  const width = donutCanvas.width;
  const height = donutCanvas.height;
  const counts = ["run", "ride", "walk"].map((sport) => routes.filter((route) => route.sport === sport).length);
  const colors = ["#34d399", "#38bdf8", "#f7b955"];
  const total = counts.reduce((sum, count) => sum + count, 0);
  let start = -Math.PI / 2;
  ctx.clearRect(0, 0, width, height);
  counts.forEach((count, index) => {
    const angle = (count / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.strokeStyle = colors[index];
    ctx.lineWidth = Math.min(width, height) * .12;
    ctx.arc(width / 2, height / 2, Math.min(width, height) * .26, start, start + angle);
    ctx.stroke();
    start += angle;
  });
  ctx.fillStyle = "#eef5f1";
  ctx.font = `700 ${28 * (window.devicePixelRatio || 1)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${routes.length}`, width / 2, height / 2 + 8);
  ctx.textAlign = "start";
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
}

function renderInsights() {
  const total = routes.reduce((sum, route) => sum + route.distance, 0);
  const longest = routes.reduce((best, route) => route.distance > best.distance ? route : best, routes[0]);
  const elevation = routes.reduce((sum, route) => sum + route.elevation, 0);
  document.getElementById("insights").innerHTML = `
    <li>Your current demo library covers ${total.toFixed(1)} km across ${routes.length} logged activities.</li>
    <li>${longest.name} is the longest route at ${longest.distance} km.</li>
    <li>Total elevation gain is ${elevation.toLocaleString()} m, useful for weekly load scoring.</li>
  `;
}

function renderRouteTable() {
  const table = document.getElementById("routeTable");
  const rows = visibleRoutes().map((route) => `
    <div class="route-row">
      <span>${route.name}<br><small>${route.city}</small></span>
      <span>${route.sport}</span>
      <span>${route.distance} km</span>
      <span>${route.elevation} m</span>
    </div>
  `).join("");
  table.innerHTML = `<div class="route-row header"><span>Name</span><span>Sport</span><span>Distance</span><span>Elevation</span></div>${rows}`;
}

function switchView(name) {
  Object.values(views).forEach((view) => view.classList.remove("active"));
  views[name].classList.add("active");
  document.getElementById("viewTitle").textContent = viewTitles[name];
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === name);
  });
  renderAll();
}

function renderAll() {
  renderStats();
  renderActivityList();
  drawHeatmap();
  drawBars();
  drawDonut();
  renderInsights();
  renderRouteTable();
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.getElementById("sportFilter").addEventListener("change", (event) => {
  filter = event.target.value;
  renderAll();
});

document.getElementById("routeSearch").addEventListener("input", (event) => {
  query = event.target.value;
  renderAll();
});

document.getElementById("zoomIn").addEventListener("click", () => {
  zoom = Math.min(1.45, zoom + .1);
  drawHeatmap();
});

document.getElementById("zoomOut").addEventListener("click", () => {
  zoom = Math.max(.8, zoom - .1);
  drawHeatmap();
});

document.getElementById("recenter").addEventListener("click", () => {
  zoom = 1;
  drawHeatmap();
});

document.getElementById("syncButton").addEventListener("click", () => {
  const nextId = Math.max(...routes.map((route) => route.id)) + 1;
  routes.unshift({
    id: nextId,
    name: "Fresh Strava sync",
    city: "Live import",
    sport: "run",
    distance: 7.7,
    minutes: 43,
    elevation: 64,
    points: [[.22,.78],[.29,.70],[.38,.64],[.51,.59],[.63,.51],[.78,.48]],
  });
  selectedId = nextId;
  saveRoutes();
  renderAll();
});

document.getElementById("addRoute").addEventListener("click", () => {
  document.getElementById("syncButton").click();
});

document.getElementById("resetData").addEventListener("click", () => {
  routes = seedRoutes;
  selectedId = routes[0].id;
  saveRoutes();
  renderAll();
});

document.getElementById("exportJson").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(routes, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "heatrun-routes.json";
  link.click();
  URL.revokeObjectURL(link.href);
});

const installButton = document.getElementById("installButton");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

window.addEventListener("resize", renderAll);
renderAll();
