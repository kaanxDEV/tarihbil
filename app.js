// --- 1. KÜRESEL DEĞİŞKENLER VE DİL YÖNETİMİ ---
let currentLang = localStorage.getItem('appLang') || 'tr';
let globalEventsData = []; 
let activeEvent = null;    
let activeCityFilter = null; 
let activeCategoryFilter = 'all'; // Kategori Süzgeci: 'all', 'event', 'museum', 'monument'
let isAdminMode = false; 
let activeMarkersMap = new Map(); 

const uiTranslations = {
    tr: { appTitle: "Dijital Tarih Hafızası", appSubtitle: "Türkiye Etkileşimli Tarih Haritası", loadingText: "Tarihi Arşiv Yükleniyor...", errorText: "Tarihi arşiv yüklenirken bir bağlantı sorunu oluştu.", panelCategory: "Tarihi Hafıza", sponsorBadge: "SPONSORLU", audioTitle: "Sesli Anlatım", audioSub: "Dönem Ses Arşivi", adsenseTitle: "Sponsorlu Bağlantı • 300x250", adsenseSub: "Responsive Reklam Alanı", nativeSponsorTag: "Tarihi Destekçi", nativeSponsorText: "Bu tarihi hafıza", nativeSponsorSub: "katkılarıyla dijitalleştirilmiştir.", backToMapBtn: "Haritaya Geri Dön", bannerTag: "Sponsor", bannerText: "Tarih kitaplarında %50'ye varan indirimleri keşfedin!", bannerBtn: "İncele", cityBtnText: "Şehirler", cityModalTitle: "Şehirlere Göre Tarihi Hafıza", cityModalSub: "Keşfetmek istediğiniz şehri seçerek ilgili tarihi noktalara doğrudan odaklanın:", showAllBtn: "🌍 Tüm Şehirleri ve Noktaları Göster", filterText: "📍 Filtre: ", eventCount: "Olay" },
    en: { appTitle: "Digital History Memory", appSubtitle: "Turkey Interactive History Map", loadingText: "Loading Historical Archives...", errorText: "A connection error occurred while loading historical archives.", panelCategory: "Historical Memory", sponsorBadge: "SPONSORED", audioTitle: "Audio Narration", audioSub: "Period Audio Archive", adsenseTitle: "Sponsored Link • 300x250", adsenseSub: "Responsive Ad Area", nativeSponsorTag: "Historical Supporter", nativeSponsorText: "This historical memory was digitized with the support of", nativeSponsorSub: ".", backToMapBtn: "Return to Map", bannerTag: "Sponsor", bannerText: "Discover up to 50% discounts on history books!", bannerBtn: "Explore", cityBtnText: "Cities", cityModalTitle: "Historical Memory by Cities", cityModalSub: "Select a city to explore and directly focus on its historical points:", showAllBtn: "🌍 Show All Cities and Points", filterText: "📍 Filter: ", eventCount: "Events" }
};

const getLocalized = (val, lang = currentLang) => {
    if (!val) return '';
    const res = typeof val === 'object' ? (val[lang] || val['tr'] || '') : val;
    return String(res);
};

const getCleanCityName = (event, lang = currentLang) => {
    if (event.city) return getLocalized(event.city, lang).trim();
    const rawLoc = getLocalized(event.locationName, lang);
    if (!rawLoc) return "Diğer";
    return rawLoc.split(/[/\-,]/)[0].trim();
};

function applyUITranslations() {
    const t = uiTranslations[currentLang];
    const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    safeSetText('uiAppTitle', t.appTitle); safeSetText('uiAppSubtitle', t.appSubtitle); safeSetText('uiLoadingText', t.loadingText);
    safeSetText('uiPanelCategory', t.panelCategory); safeSetText('uiSponsorBadge', t.sponsorBadge); safeSetText('uiAudioTitle', t.audioTitle);
    safeSetText('uiAudioSub', t.audioSub); safeSetText('uiAdsenseTitle', t.adsenseTitle); safeSetText('uiAdsenseSub', t.adsenseSub);
    safeSetText('uiNativeSponsorTag', t.nativeSponsorTag); safeSetText('uiNativeSponsorText', t.nativeSponsorText);
    safeSetText('uiNativeSponsorSub', t.nativeSponsorSub); safeSetText('uiBackToMapBtn', t.backToMapBtn);
    safeSetText('uiBannerTag', t.bannerTag); safeSetText('uiBannerText', t.bannerText); safeSetText('uiBannerBtn', t.bannerBtn);
    safeSetText('uiCityBtnText', t.cityBtnText); safeSetText('uiCityModalTitle', t.cityModalTitle);
    safeSetText('uiCityModalSub', t.cityModalSub); safeSetText('uiShowAllBtn', t.showAllBtn);

    const btnTR = document.getElementById('btnLangTR'); const btnEN = document.getElementById('btnLangEN');
    if (btnTR && btnEN) {
        btnTR.className = currentLang === 'tr' ? "px-2.5 py-1 text-[11px] font-extrabold rounded-full transition-all duration-200 bg-amber-500 text-slate-950 shadow-sm" : "px-2.5 py-1 text-[11px] font-extrabold rounded-full transition-all duration-200 text-slate-400 hover:text-white";
        btnEN.className = currentLang === 'en' ? "px-2.5 py-1 text-[11px] font-extrabold rounded-full transition-all duration-200 bg-amber-500 text-slate-950 shadow-sm" : "px-2.5 py-1 text-[11px] font-extrabold rounded-full transition-all duration-200 text-slate-400 hover:text-white";
    }
}

function setLanguage(lang) {
    if (currentLang === lang) return;
    currentLang = lang; localStorage.setItem('appLang', lang);
    applyUITranslations();
    scheduleViewportRender(true);
    const historyPanel = document.getElementById('historyPanel');
    if (activeEvent && historyPanel && !historyPanel.classList.contains('translate-y-full')) updatePanelDOM(activeEvent); 
}

// --- 2. MEKANSAL IZGARA ENDEKSLEME (SPATIAL GRID INDEXING) ---
const SpatialGrid = {
    cellSize: 0.5, 
    buckets: new Map(),
    getKey(lat, lng) { return `${Math.floor(lat / this.cellSize)}_${Math.floor(lng / this.cellSize)}`; },
    build(events) {
        this.buckets.clear();
        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            const key = this.getKey(ev.coordinates[0], ev.coordinates[1]);
            let bucket = this.buckets.get(key);
            if (!bucket) { bucket = []; this.buckets.set(key, bucket); }
            bucket.push(ev);
        }
    },
    queryBounds(bounds) {
        const results = [];
        const minLat = Math.floor(bounds.getSouth() / this.cellSize);
        const maxLat = Math.floor(bounds.getNorth() / this.cellSize);
        const minLng = Math.floor(bounds.getWest() / this.cellSize);
        const maxLng = Math.floor(bounds.getEast() / this.cellSize);

        for (let x = minLat; x <= maxLat; x++) {
            for (let y = minLng; y <= maxLng; y++) {
                const bucket = this.buckets.get(`${x}_${y}`);
                if (bucket) {
                    for (let i = 0; i < bucket.length; i++) results.push(bucket[i]);
                }
            }
        }
        return results;
    }
};

// --- 3. HARİTA VE TILE MOTORU ---
const map = L.map('map', { 
    center: [38.9637, 35.2433], 
    zoom: 6, 
    zoomControl: false,
    scrollWheelZoom: false,
    attributionControl: false,
    preferCanvas: true // TÜM VECTÖRLERİ DOM YERİNE DIRECT-TO-CANVAS ÇİZER
});

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
    subdomains: 'abcd', 
    maxZoom: 19,
    updateWhenIdle: true,     
    updateWhenZooming: false, 
    keepBuffer: 2             
}).addTo(map);

let markerLayerGroup = L.layerGroup().addTo(map);

// SİNEMATİK MOUSE SCROLL ZOOM
let isZooming = false;
document.getElementById('map').addEventListener('wheel', (e) => {
    e.preventDefault();
    if (isZooming) return;
    const delta = e.deltaY < 0 ? 1 : -1;
    const targetZoom = Math.min(Math.max(map.getZoom() + delta, 4), 18);
    if (targetZoom === map.getZoom()) return;
    isZooming = true;
    const cursorLatLng = map.mouseEventToLatLng(e);
    map.flyTo(cursorLatLng, targetZoom, { animate: true, duration: 0.65, easeLinearity: 0.2 });
    setTimeout(() => { isZooming = false; }, 650);
}, { passive: false });

// KATEGORİ RENK VE İKON MATRİSİ
const getMarkerMeta = (type, isSponsor) => {
    if (isSponsor) return { color: '#f59e0b', cssClass: 'pulse-marker', iconLabel: '★', titleCat: 'SPONSORLU' };
    switch (type) {
        case 'museum':   return { color: '#10b981', cssClass: 'museum-marker', iconLabel: '🏛️', titleCat: 'MÜZE & ÖREN YERİ' };
        case 'monument': return { color: '#3b82f6', cssClass: 'monument-marker', iconLabel: '⛩️', titleCat: 'ANIT & CEPHE' };
        case 'event':    
        default:         return { color: '#ef4444', cssClass: 'pulse-marker', iconLabel: '', titleCat: 'TARİHİ OLAY' };
    }
};

const getCustomDivIcon = (type, isSponsor) => {
    const meta = getMarkerMeta(type, isSponsor);
    const labelHtml = meta.iconLabel ? `<span class="text-[10px] select-none font-bold">${meta.iconLabel}</span>` : '';
    
    // style özniteliğine "border-radius: 50% !important;" eklenerek kare görünümü kesin olarak engellenir
    return L.divIcon({ 
        className: 'custom-div-icon', 
        html: `<div class="${meta.cssClass}" style="background-color: ${meta.color} !important; border-color: #ffffff !important; border-radius: 50% !important;">${labelHtml}</div>`, 
        iconSize: [24, 24], 
        iconAnchor: [12, 12] 
    });
};

// --- 4. SIFIR GECİKMELİ RENDER MOTORU ---
let renderTimeout = null;

function scheduleViewportRender(forceRebuild = false) {
    if (renderTimeout) cancelAnimationFrame(renderTimeout);
    renderTimeout = requestAnimationFrame(() => {
        renderMarkersInViewport(forceRebuild);
    });
}

function renderMarkersInViewport(forceRebuild = false) {
    if (forceRebuild) {
        markerLayerGroup.clearLayers();
        activeMarkersMap.clear();
    }

    const currentBounds = map.getBounds().pad(0.05); 
    const currentZoom = map.getZoom();
    const useDOMAnim = currentZoom >= 10; 

    // O(1) ızgara sorgusu ile ekrandaki adayları çek
    let candidateEvents = activeCityFilter 
        ? globalEventsData.filter(e => getCleanCityName(e, 'tr').toLowerCase() === activeCityFilter.toLowerCase() || getCleanCityName(e, 'en').toLowerCase() === activeCityFilter.toLowerCase())
        : SpatialGrid.queryBounds(currentBounds);

    // KATEGORİ FİLTRESİ UYGULAMA (Olay, Müze, Anıt ayrımı)
    if (activeCategoryFilter !== 'all') {
        candidateEvents = candidateEvents.filter(e => (e.type || 'event') === activeCategoryFilter);
    }

    const visibleEventsMap = new Map();
    for (let i = 0; i < candidateEvents.length; i++) {
        const ev = candidateEvents[i];
        if (currentBounds.contains(ev.coordinates)) visibleEventsMap.set(ev.id, ev);
    }

    // Ekran dışına çıkanları bellekten düşür
    activeMarkersMap.forEach((marker, id) => {
        if (!visibleEventsMap.has(id)) {
            markerLayerGroup.removeLayer(marker);
            activeMarkersMap.delete(id);
        }
    });

    // Yeni girenleri çiz veya modülü dönüştür
    visibleEventsMap.forEach((event, id) => {
        const existingMarker = activeMarkersMap.get(id);

        if (existingMarker) {
            if (existingMarker._isDOM !== useDOMAnim) {
                markerLayerGroup.removeLayer(existingMarker);
                activeMarkersMap.delete(id);
            } else return; 
        }

        const itemType = event.type || 'event';
        const meta = getMarkerMeta(itemType, event.sponsorAd);
        let marker;

        if (useDOMAnim) {
            marker = L.marker(event.coordinates, { icon: getCustomDivIcon(itemType, event.sponsorAd) });
            marker._isDOM = true;
        } else {
            marker = L.circleMarker(event.coordinates, {
                radius: currentZoom >= 8 ? 6 : 4,
                fillColor: meta.color,
                color: '#ffffff',
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.85
            });
            marker._isDOM = false;
        }

        const locTitle = getLocalized(event.title);
        const locSum = getLocalized(event.summary);
        const shortSum = locSum.length > 85 ? locSum.substring(0, 85) + '...' : locSum;
        const tooltipContent = `<div class="text-center w-[220px] whitespace-normal"><div class="text-[10px] font-bold tracking-wider" style="color:${meta.color};">${meta.titleCat} • ${event.date}</div><div class="text-sm font-bold text-white my-0.5 leading-snug break-words">${locTitle}</div><div class="text-[11px] text-slate-300 font-normal leading-normal border-t border-slate-700/60 pt-1 mt-1 break-words">${shortSum}</div></div>`;
        
        marker.bindTooltip(tooltipContent, { direction: 'top', offset: [0, -6], className: 'custom-tooltip', opacity: 1 });
        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e); 
            activeEvent = event; 
            openPanel(event); 
            map.flyTo(event.coordinates, 10.5, { animate: true, duration: 1.8, easeLinearity: 0.2 });
        });

        markerLayerGroup.addLayer(marker);
        activeMarkersMap.set(id, marker);
    });
}

map.on('moveend zoomend', () => scheduleViewportRender(false));

function renderMarkers(events) {
    SpatialGrid.build(events); 
    scheduleViewportRender(true);
}

// --- 5. KATEGORİ SÜZGECİ YÖNETİMİ ---
function setCategoryFilter(category) {
    if (activeCategoryFilter === category) return;
    activeCategoryFilter = category;
    
    const categories = ['all', 'event', 'museum', 'monument'];
    categories.forEach(cat => {
        const btn = document.getElementById(`btnCat_${cat}`);
        if (!btn) return;
        if (cat === category) {
            btn.className = "px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 shadow-sm transition font-extrabold flex items-center gap-1";
        } else {
            btn.className = "px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition flex items-center gap-1";
        }
    });

    scheduleViewportRender(true);
}

// --- 6. ŞEHİR FİHRİSTİ VE FİLTRELEME SİSTEMİ ---
function openCityModal() {
    const container = document.getElementById('cityListContainer');
    container.innerHTML = '';
    
    const cityMap = {};
    for (let i = 0; i < globalEventsData.length; i++) {
        const ev = globalEventsData[i];
        const cityName = getCleanCityName(ev);
        if (!cityMap[cityName]) cityMap[cityName] = [];
        cityMap[cityName].push(ev);
    }

    const sortedCities = Object.keys(cityMap).sort((a, b) => a.localeCompare(b));

    if (sortedCities.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Henüz kayıtlı şehir bulunamadı.</p>';
    } else {
        sortedCities.forEach(city => {
            const count = cityMap[city].length;
            const btn = document.createElement('button');
            btn.className = "w-full bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 p-3 rounded-xl flex items-center justify-between text-left transition group";
            btn.innerHTML = `
                <div class="flex items-center gap-2.5">
                    <span class="w-2 h-2 rounded-full bg-amber-500 group-hover:scale-125 transition"></span>
                    <span class="text-sm font-semibold text-white group-hover:text-amber-400 transition">${city}</span>
                </div>
                <span class="text-xs bg-slate-900 text-slate-400 group-hover:text-amber-300 px-2.5 py-1 rounded-md border border-slate-800 font-mono font-bold">${count} ${uiTranslations[currentLang].eventCount}</span>
            `;
            btn.onclick = () => focusCityBounds(city, cityMap[city]);
            container.appendChild(btn);
        });
    }
    document.getElementById('cityIndexModal').classList.remove('hidden');
}

function closeCityModal() { document.getElementById('cityIndexModal').classList.add('hidden'); }

function focusCityBounds(cityName, eventsInCity) {
    closeCityModal();
    closePanel();
    activeCityFilter = cityName;
    
    const filterBar = document.getElementById('activeCityFilterBar');
    const filterText = document.getElementById('activeCityFilterText');
    filterText.innerHTML = `<span>📍 Filtre: ${cityName} (${eventsInCity.length} ${uiTranslations[currentLang].eventCount})</span>`;
    filterBar.classList.remove('hidden');

    scheduleViewportRender(true);

    if (eventsInCity.length === 1) {
        map.flyTo(eventsInCity[0].coordinates, 11, { animate: true, duration: 2.0, easeLinearity: 0.2 });
    } else {
        const bounds = L.latLngBounds(eventsInCity.map(e => e.coordinates));
        map.flyToBounds(bounds, { padding: [80, 80], maxZoom: 12, animate: true, duration: 2.0, easeLinearity: 0.2 });
    }
}

function resetCityFilter() {
    activeCityFilter = null;
    document.getElementById('activeCityFilterBar').classList.add('hidden');
    scheduleViewportRender(true);
    map.flyTo([38.9637, 35.2433], 6, { animate: true, duration: 1.8, easeLinearity: 0.25 });
}

// --- 7. ASENKRON VERİ YÜKLEME ---
async function loadHistoricalEvents() {
    applyUITranslations(); 
    const loadingOverlay = document.getElementById('loadingOverlay');
    try {
        const response = await fetch(`data/events.json?t=${Date.now()}`);
        let serverData = response.ok ? await response.json() : [];
        let localCustomEvents = JSON.parse(localStorage.getItem('customEvents_v1') || '[]');
        globalEventsData = [...serverData, ...localCustomEvents];
        renderMarkers(globalEventsData); 
    } catch (error) {
        console.error("Veri yükleme hatası:", error);
        let localCustomEvents = JSON.parse(localStorage.getItem('customEvents_v1') || '[]');
        if (localCustomEvents.length > 0) { 
            globalEventsData = localCustomEvents; 
            renderMarkers(globalEventsData); 
        }
    } finally {
        if (loadingOverlay) { loadingOverlay.classList.add('opacity-0', 'pointer-events-none'); setTimeout(() => loadingOverlay.remove(), 300); }
    }
}
loadHistoricalEvents();

// --- 8. DETAY PANELİ YÖNETİMİ ---
const historyPanel = document.getElementById('historyPanel');
const panelContentWrapper = document.getElementById('panelContentWrapper');

function updatePanelDOM(event) {
    const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    safeSet('panelTitle', getLocalized(event.title)); 
    safeSet('panelDate', event.date);
    
    const cityStr = getCleanCityName(event);
    const locStr = getLocalized(event.locationName);
    safeSet('panelLocation', locStr && locStr !== cityStr ? `${cityStr} • ${locStr}` : cityStr);
    
    safeSet('panelSummary', getLocalized(event.summary));
    safeSet('panelFullText', getLocalized(event.fullText));
    const imgEl = document.getElementById('panelImage'); if (imgEl) imgEl.src = event.imageUrl;
    
    // Kategoriye göre etiket rengi ve ismi güncelle
    const meta = getMarkerMeta(event.type || 'event', event.sponsorAd);
    const catBadge = document.getElementById('uiPanelCategory');
    if (catBadge) {
        catBadge.textContent = meta.titleCat;
        catBadge.style.color = meta.color;
        catBadge.style.borderColor = meta.color;
    }

    const badge = document.getElementById('uiSponsorBadge'); if (badge) event.sponsorAd ? badge.classList.remove('hidden') : badge.classList.add('hidden');
    const audio = document.getElementById('panelAudio');
    if (audio) { if (event.audioUrl) { audio.src = event.audioUrl; audio.load(); audio.parentElement.classList.remove('hidden'); } else audio.parentElement.classList.add('hidden'); }
    
    const deleteBox = document.getElementById('adminDeleteBox');
    if (deleteBox) isAdminMode ? deleteBox.classList.remove('hidden') : deleteBox.classList.add('hidden');
}

function openPanel(event) {
    const isPanelOpen = !historyPanel.classList.contains('translate-y-full') && !historyPanel.classList.contains('md:translate-x-full');
    if (isPanelOpen) {
        panelContentWrapper.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => { updatePanelDOM(event); panelContentWrapper.classList.replace('opacity-0', 'opacity-100'); }, 200);
    } else {
        updatePanelDOM(event); historyPanel.classList.remove('translate-y-full', 'md:translate-x-full'); historyPanel.classList.add('translate-y-0', 'md:translate-x-0');
    }
}

function closePanel() {
    if (!historyPanel) return;
    historyPanel.classList.remove('translate-y-0', 'md:translate-x-0'); historyPanel.classList.add('translate-y-full', 'md:translate-x-full');
    const audio = document.getElementById('panelAudio'); if (audio) { audio.pause(); audio.currentTime = 0; }
    activeEvent = null;
}

map.on('click', (e) => {
    if (isAdminMode && typeof openAdminForm === 'function') {
        openAdminForm(e.latlng);
    } else if (historyPanel && !historyPanel.classList.contains('translate-y-full')) {
        closePanel();
    }
});

document.addEventListener('keydown', (e) => { 
    if (e.key === 'Escape') { 
        closePanel(); 
        closeCityModal(); 
        if (typeof closeAdminForm === 'function') closeAdminForm(); 
        if (typeof closeLoginModal === 'function') closeLoginModal(); 
    } 
});