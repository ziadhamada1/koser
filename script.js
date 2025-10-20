// 🗺️ إنشاء الخريطة
var map = L.map('map').setView([26.7, 33.9], 7);

// 🧭 الطبقات الأساسية
var baseMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
var elevation = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png');
var slope = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}');
var floodHazard = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
var landUse = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png');

// طبقات البيانات
var floodLayer, damsLayer;

// 🔄 تبديل الطبقات
document.getElementById("mapSelect").addEventListener("change", function(e) {
  let desc = document.getElementById("mapDescription");
  switch (e.target.value) {
    case "elevation":
      fadeLayer(elevation);
      updateMapTitle("🌊 خريطة الارتفاعات");
      desc.innerHTML = "<h3>🌊 خريطة الارتفاعات</h3><p>توضح الفروق التضاريسية لتحديد اتجاهات جريان السيول.</p>";
      break;
    case "slope":
      fadeLayer(slope);
      updateMapTitle("🏔️ خريطة الانحدار");
      desc.innerHTML = "<h3>🏔️ خريطة الانحدار</h3><p>توضح شدة الانحدار لتحديد المناطق الأكثر عرضة للسيول.</p>";
      break;
    case "flood":
      fadeLayer(floodHazard);
      updateMapTitle("⚠️ خريطة أخطار السيول");
      desc.innerHTML = "<h3>⚠️ خريطة أخطار السيول</h3><p>تعرض المناطق المعرضة لمخاطر السيول لتحديد أولويات الحماية.</p>";
      break;
    case "landuse":
      fadeLayer(landUse);
      updateMapTitle("🏘️ خريطة استخدامات الأراضي");
      desc.innerHTML = "<h3>🏘️ خريطة استخدامات الأراضي</h3><p>توضح توزيع الأنشطة البشرية المتأثرة بالسيول.</p>";
      break;
    default:
      fadeLayer(null);
      updateMapTitle("🌍 الخريطة الأساسية");
      desc.innerHTML = "<h3>🌍 الخريطة الأساسية</h3><p>تعرض المدن والطرق والمعالم العامة.</p>";
  }
});

function fadeLayer(newLayer) {
  map.eachLayer(l => { if (l !== baseMap && l !== floodLayer && l !== damsLayer) map.removeLayer(l); });
  if (newLayer) newLayer.addTo(map);
}

function updateMapTitle(text) {
  const title = document.getElementById("mapTitle");
  title.classList.add("hidden");
  setTimeout(() => { title.textContent = text; title.classList.remove("hidden"); }, 400);
}

// ✅ تحميل ملفات GeoJSON
function handleGeoJSONUpload(inputId, color, label, layerRef) {
  document.getElementById(inputId).addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const data = JSON.parse(e.target.result);
      if (layerRef.value) map.removeLayer(layerRef.value);
      layerRef.value = L.geoJSON(data, {
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          radius: 7, fillColor: color, color: "#fff", weight: 1, fillOpacity: 0.8
        }).bindPopup(label)
      }).addTo(map);
      map.fitBounds(layerRef.value.getBounds());
      summarizeLayer(layerRef.value, label);
      updateLayerControl();
    };
    reader.readAsText(file);
  });
}

handleGeoJSONUpload("floodUpload", "red", "⚠️ منطقة معرضة للسيول", { value: floodLayer });
handleGeoJSONUpload("damUpload", "blue", "🏗️ سد مقترح", { value: damsLayer });

// 🧮 ملخص النقاط
function summarizeLayer(layer, label) {
  let count = 0;
  layer.eachLayer(() => count++);
  alert(`${label}: ${count} نقطة`);
}

// 🧩 تحميل افتراضي
["flood_zones.geojson", "dams_locations.geojson"].forEach((file, i) => {
  fetch(file)
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (!data) return;
      let color = i === 0 ? "red" : "blue";
      let label = i === 0 ? "⚠️ منطقة معرضة للسيول" : "🏗️ سد مقترح";
      let layer = L.geoJSON(data, {
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          radius: 8, fillColor: color, color: "#fff", weight: 1, fillOpacity: 0.9
        }).bindPopup(label)
      }).addTo(map);
      if (i === 0) floodLayer = layer; else damsLayer = layer;
      updateLayerControl();
    });
});

// ⚙️ عناصر التحكم
L.control.scale({ position: 'bottomleft' }).addTo(map);
L.control.measure({
  primaryLengthUnit: 'kilometers',
  primaryAreaUnit: 'sqkilometers',
  activeColor: '#005f73',
  completedColor: '#94d2bd'
}).addTo(map);

// 📍 إحداثيات
map.on('click', e => {
  L.popup().setLatLng(e.latlng)
    .setContent(`📍 <b>إحداثيات:</b><br>${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`)
    .openOn(map);
});

// 🏠 زر العودة
L.Control.ZoomHome = L.Control.extend({
  onAdd: function() {
    const btn = L.DomUtil.create("button", "home-btn");
    btn.innerHTML = "🏠";
    btn.title = "الرجوع لمنطقة الدراسة";
    btn.onclick = () => map.setView([26.7, 33.9], 7);
    return btn;
  }
});
L.control.zoomHome = opts => new L.Control.ZoomHome(opts);
L.control.zoomHome({ position: "topleft" }).addTo(map);

// 🧩 تحكم في الطبقات
var layerControl;
function updateLayerControl() {
  if (layerControl) map.removeControl(layerControl);
  var baseLayers = {
    "🗺️ الخريطة الأساسية": baseMap,
    "🌊 الارتفاعات": elevation,
    "🏔️ الانحدار": slope,
    "⚠️ أخطار السيول": floodHazard,
    "🏘️ استخدامات الأراضي": landUse
  };
  var overlays = {};
  if (floodLayer) overlays["🔴 مناطق السيول"] = floodLayer;
  if (damsLayer) overlays["🔵 مواقع السدود"] = damsLayer;
  layerControl = L.control.layers(baseLayers, overlays, { collapsed: false }).addTo(map);
}



function openPopup(imgSrc, title, desc) {
  const popup = document.getElementById('imagePopup');
  const img = document.getElementById('popupImg');
  const titleEl = document.getElementById('popupTitle');
  const descEl = document.getElementById('popupDesc');

  img.src = imgSrc;
  img.style.display = "block"; // تأكيد ظهور الصورة
  titleEl.innerText = title;
  descEl.innerText = desc;

  popup.style.display = "block";
}

function closePopup() {
  document.getElementById('imagePopup').style.display = "block";
}

// إغلاق عند الضغط خارج الصورة
window.onclick = function(e) {
  const popup = document.getElementById('imagePopup');
  if (e.target === popup) closePopup();
};
// 🖼️ دالة فتح الصورة في الـ Popup
function openPopup(imgSrc, title, desc) {
  const popup = document.getElementById("imagePopup");
  const popupImg = document.getElementById("popupImg");
  const popupTitle = document.getElementById("popupTitle");
  const popupDesc = document.getElementById("popupDesc");

  // ضبط المحتوى
  popupImg.src = imgSrc;
  popupTitle.textContent = title;
  popupDesc.textContent = desc;

  // عرض النافذة
  popup.style.display = "block";
}

// ❌ دالة إغلاق النافذة
function closePopup() {
  document.getElementById("imagePopup").style.display = "none";
}
