// --- YÖNETİCİ GÜVENLİK VE İŞLEM MOTORU ---
const ADMIN_PASSWORD = "1923"; 
let selectedCoordinates = null;

function openLoginModal() { document.getElementById('adminLoginModal').classList.remove('hidden'); }
function closeLoginModal() { document.getElementById('adminLoginModal').classList.add('hidden'); document.getElementById('loginErrorText').classList.add('hidden'); }

function attemptLogin() {
    const pass = document.getElementById('adminPasswordInput').value;
    if (pass === ADMIN_PASSWORD) {
        isAdminMode = true;
        closeLoginModal();
        document.getElementById('adminStatusBar').classList.remove('hidden');
        document.getElementById('mainHeader').classList.add('translate-y-8');
        document.getElementById('map').classList.add('admin-active-cursor');
        if (activeEvent) updatePanelDOM(activeEvent);
    } else {
        document.getElementById('loginErrorText').classList.remove('hidden');
    }
}

function logoutAdmin() {
    isAdminMode = false;
    document.getElementById('adminStatusBar').classList.add('hidden');
    document.getElementById('mainHeader').classList.remove('translate-y-8');
    document.getElementById('map').classList.remove('admin-active-cursor');
    closeAdminForm();
    if (activeEvent) updatePanelDOM(activeEvent);
}

function openAdminForm(latlng) {
    selectedCoordinates = [parseFloat(latlng.lat.toFixed(6)), parseFloat(latlng.lng.toFixed(6))];
    document.getElementById('displayCoords').textContent = `${selectedCoordinates[0]}, ${selectedCoordinates[1]}`;
    document.getElementById('adminFormPanel').classList.remove('translate-x-full');
}

function closeAdminForm() {
    document.getElementById('adminFormPanel').classList.add('translate-x-full');
    document.getElementById('addEventForm').reset();
    selectedCoordinates = null;
}

// YENİ NOKTAYI KATEGORİSİYLE BİRLİKTE KAYDETME FONKSİYONU
function saveNewEvent(e) {
    e.preventDefault();
    if (!selectedCoordinates) return;

    // YÖNETİCİNİN SEÇTİĞİ KATEGORİYİ AL ('event', 'museum', 'monument')
    const selectedType = document.getElementById('admType').value || "event";

    const newEventObj = {
        id: "evt_" + Date.now(),
        type: selectedType, // KATEGORİ PARAMETRESİ EKLENDİ
        coordinates: selectedCoordinates,
        date: document.getElementById('admDate').value,
        title: { tr: document.getElementById('admTitleTR').value, en: document.getElementById('admTitleEN').value },
        city: { tr: document.getElementById('admCityTR').value.trim(), en: document.getElementById('admCityEN').value.trim() },
        locationName: { tr: document.getElementById('admLocTR').value.trim(), en: document.getElementById('admLocEN').value.trim() },
        summary: { tr: document.getElementById('admSumTR').value, en: document.getElementById('admSumEN').value },
        fullText: { tr: document.getElementById('admFullTR').value, en: document.getElementById('admFullEN').value },
        imageUrl: document.getElementById('admImage').value,
        audioUrl: document.getElementById('admAudio').value || "",
        sponsorAd: document.getElementById('admSponsor').checked
    };

    let localEvents = JSON.parse(localStorage.getItem('customEvents_v1') || '[]');
    localEvents.push(newEventObj);
    localStorage.setItem('customEvents_v1', JSON.stringify(localEvents));

    globalEventsData.push(newEventObj);
    renderMarkers(globalEventsData); // Harita otomatik yenilenir ve filtrelere dahil olur
    
    closeAdminForm();
    alert("Yeni nokta seçilen kategoriyle başarıyla haritaya eklendi!");
}

function deleteCurrentMarker() {
    if (!activeEvent || !isAdminMode) return;
    const confirmDelete = confirm(`"${getLocalized(activeEvent.title)}" noktasını kalıcı olarak silmek istediğinize emin misiniz?`);
    if (!confirmDelete) return;

    globalEventsData = globalEventsData.filter(item => item !== activeEvent && item.id !== activeEvent.id);

    let localEvents = JSON.parse(localStorage.getItem('customEvents_v1') || '[]');
    localEvents = localEvents.filter(item => item.id !== activeEvent.id && JSON.stringify(item.coordinates) !== JSON.stringify(activeEvent.coordinates));
    localStorage.setItem('customEvents_v1', JSON.stringify(localEvents));

    closePanel();
    renderMarkers(globalEventsData);
    alert("Tarihi nokta başarıyla silindi!");
}

function exportEventsJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(globalEventsData, null, 4));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "events.json");
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
}