// 1. Initialize Map
const map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true
}).setView([34.0522, -118.2437], 15);

// High-end Dark Theme Tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Configurations & State
const NODE_COLORS = {
    "Viper-Actual": "color-blue",
    "Ghost-2": "color-purple",
    "Spectre-4": "color-yellow",
    "Raven-1": "color-pink",
    "Shadow-9": "color-cyan",
    "default": "marker-verified" // Default fallback
};

let nodesData = {};
let config = {
    showPredicted: true,
    showTrails: true,
    focusedNode: null // 'null' means free camera
};

const mapElements = {}; // Stores { marker, polyline, isEstimated }
let isFirstLoad = true;

// DOM Elements
const nodeListEl = document.getElementById('node-list');
const alertsContainer = document.getElementById('alerts-container');
const focusControlsEl = document.getElementById('focus-controls');
const btnUnfocus = document.getElementById('btn-unfocus');

// ----------------------------------------------------
// Event Listeners for Controls
// ----------------------------------------------------
document.getElementById('toggle-predicted').addEventListener('change', (e) => {
    config.showPredicted = e.target.checked;
    updateVisibility();
});

document.getElementById('toggle-trails').addEventListener('change', (e) => {
    config.showTrails = e.target.checked;
    updateVisibility();
});

btnUnfocus.addEventListener('click', () => {
    config.focusedNode = null;
    document.querySelectorAll('.focus-btn').forEach(b => b.classList.remove('active'));
    btnUnfocus.classList.add('active');
});

// Toggle right panel
function toggleRightPanel() {
    const panel = document.getElementById('right-panel');
    const btn = document.getElementById('right-toggle-btn');
    
    if (panel.classList.contains('hidden-panel')) {
        panel.classList.remove('hidden-panel');
        btn.classList.remove('panel-closed');
        btn.querySelector('span').style.transform = 'scaleX(-1)';
    } else {
        panel.classList.add('hidden-panel');
        btn.classList.add('panel-closed');
        btn.querySelector('span').style.transform = 'scaleX(1)';
    }
}

function focusNode(id) {
    config.focusedNode = id;
    document.querySelectorAll('.focus-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-focus-${id}`).classList.add('active');
    
    if (nodesData[id]) {
        map.flyTo([nodesData[id].currentLat, nodesData[id].currentLng], 16, { animate: true, duration: 1.5 });
    }
}

function updateVisibility() {
    Object.keys(mapElements).forEach(id => {
        const el = mapElements[id];
        
        // Handle Marker Visibility
        if (!config.showPredicted && el.isEstimated) {
            map.removeLayer(el.marker);
        } else {
            if (!map.hasLayer(el.marker)) el.marker.addTo(map);
        }
        
        // Handle Trail Visibility
        if (!config.showTrails) {
            map.removeLayer(el.polyline);
        } else {
            if (!map.hasLayer(el.polyline)) el.polyline.addTo(map);
        }
    });
}

// ----------------------------------------------------
// Math & Logic Utilities
// ----------------------------------------------------
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
}

function getHeading(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI/180;
    const l1 = lat1 * Math.PI/180;
    const l2 = lat2 * Math.PI/180;
    const y = Math.sin(dLon) * Math.cos(l2);
    const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon);
    let brng = Math.atan2(y, x);
    brng = brng * (180 / Math.PI);
    return (brng + 360) % 360; // 0-360 degrees
}

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

// ----------------------------------------------------
// Alert System
// ----------------------------------------------------
function showAlert(message, type = 'warning') {
    const el = document.createElement('div');
    el.className = `alert-banner ${type}`;
    const icon = type === 'warning' ? '⚠️' : '⚡';
    el.innerHTML = `<span class="alert-icon">${icon}</span> <span>${message}</span>`;
    
    // Play subtle sound if available (optional)
    
    alertsContainer.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.3s ease';
        setTimeout(() => el.remove(), 300);
    }, 4000);
}

// ----------------------------------------------------
// Data Fetching & Processing
// ----------------------------------------------------
async function fetchTelemetry() {
    try {
        const res = await fetch('/api/state');
        const data = await res.json();
        
        data.forEach(node => {
            const id = node.id;
            
            if (!nodesData[id]) {
                // Initialize new node
                nodesData[id] = {
                    id: id,
                    currentLat: node.lat,
                    currentLng: node.lng,
                    targetLat: node.lat,
                    targetLng: node.lng,
                    history: [[node.lat, node.lng]],
                    isEstimated: node.is_estimated,
                    speed: 0,
                    heading: 0,
                    battery: Math.floor(Math.random() * 20 + 80), // Simulating extra tactical data
                    signal: Math.floor(Math.random() * 30 + 70),
                    confidence: node.is_estimated ? 45 : 100
                };
                
                // Add Dynamic Focus Button
                const btn = document.createElement('button');
                btn.className = 'focus-btn';
                btn.id = `btn-focus-${id}`;
                btn.innerText = `[${id}]`;
                btn.onclick = () => focusNode(id);
                focusControlsEl.appendChild(btn);

            } else {
                // Update existing node
                const n = nodesData[id];
                
                // Calculate Speed (meters per second roughly since interval is 1s, convert to km/h)
                const dist = getDistance(n.targetLat, n.targetLng, node.lat, node.lng);
                n.speed = (dist * 3.6).toFixed(1);
                
                // Calculate Heading if moved significantly
                if (dist > 0.1) {
                    n.heading = getHeading(n.targetLat, n.targetLng, node.lat, node.lng).toFixed(0);
                }

                // Trigger Alerts on state change
                if (node.is_estimated && !n.isEstimated) {
                    showAlert(`RECONSTRUCTION ACTIVE: ${id} telemetry fragmented.`, 'warning');
                    n.confidence = Math.floor(Math.random() * 20 + 40); // Drop confidence
                    n.signal = Math.floor(Math.random() * 20 + 20); // Drop signal visually
                }
                if (!node.is_estimated && n.isEstimated) {
                    showAlert(`UPLINK RESTORED: ${id} telemetry verified.`, 'success');
                    n.confidence = 100;
                    n.signal = Math.floor(Math.random() * 30 + 70);
                }

                // Update targets for the render loop
                n.targetLat = node.lat;
                n.targetLng = node.lng;
                n.isEstimated = node.is_estimated;
                
                // Update Trail History
                n.history.push([node.lat, node.lng]);
                if (n.history.length > 40) n.history.shift(); // Keep trail relatively short
            }
        });

        // Initial Map Center
        if (isFirstLoad && data.length > 0) {
            map.setView([data[0].lat, data[0].lng], 15);
            isFirstLoad = false;
        }

        updateSidePanel();

    } catch (err) {
        console.error("Telemetry Error:", err);
    }
}

// ----------------------------------------------------
// UI Panel Rendering
// ----------------------------------------------------
function updateSidePanel() {
    let html = '';
    
    Object.values(nodesData).forEach(n => {
        const statusClass = n.isEstimated ? 'status-est' : 'status-active';
        const statusText = n.isEstimated ? 'ESTIMATED' : 'ACTIVE';
        const cardClass = n.isEstimated ? 'node-card estimated' : 'node-card';
        const confColor = n.confidence < 60 ? 'var(--orange)' : 'var(--green)';
        
        // Progress circle calculation
        const dashOffset = 100 - n.confidence;

        html += `
            <div class="${cardClass}">
                <div class="node-title">
                    <span>${n.id}</span>
                    <span class="node-status ${statusClass}">${statusText}</span>
                </div>
                <div class="stat-row">
                    <span>Confidence</span>
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <svg width="20" height="20" viewBox="0 0 36 36" style="transform: rotate(-90deg);">
                          <path stroke="rgba(255,255,255,0.1)" stroke-width="4" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path stroke="${confColor}" stroke-width="4" stroke-dasharray="${n.confidence}, 100" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <span class="stat-val" style="color: ${confColor}">${n.confidence}%</span>
                    </div>
                </div>
                <div class="stat-row"><span>Speed</span><span class="stat-val">${n.speed} km/h</span></div>
                <div class="stat-row"><span>Heading</span><span class="stat-val">${n.heading}° 🧭</span></div>
                <div class="stat-row"><span>Signal Qty</span><span class="stat-val">${n.signal}%</span></div>
                <div class="stat-row"><span>Battery</span><span class="stat-val">${n.battery}%</span></div>
            </div>
        `;
    });
    
    if (html !== '') nodeListEl.innerHTML = html;
}

// ----------------------------------------------------
// Map Render Loop (High-FPS Interpolation)
// ----------------------------------------------------
function renderLoop() {
    Object.keys(nodesData).forEach(id => {
        const n = nodesData[id];
        
        // Smooth transition (lerp) towards target coordinate
        n.currentLat = lerp(n.currentLat, n.targetLat, 0.08);
        n.currentLng = lerp(n.currentLng, n.targetLng, 0.08);
        
        const colorClass = NODE_COLORS[id] || 'marker-verified';
        const typeClass = n.isEstimated ? 'marker-estimated' : 'marker-verified';
        
        if (!mapElements[id]) {
            // Create DOM Icon
            const icon = L.divIcon({
                html: `<div class="marker-wrapper ${colorClass} ${typeClass}"><div class="halo"></div><div class="core-dot"></div></div>`,
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            
            // Create Leaflet Objects
            mapElements[id] = {
                marker: L.marker([n.currentLat, n.currentLng], { icon, zIndexOffset: 1000 }).addTo(map),
                polyline: L.polyline(n.history, { 
                    color: n.isEstimated ? '#ff5500' : '#00ff66', 
                    weight: 3, 
                    opacity: 0.5,
                    dashArray: n.isEstimated ? "5, 10" : ""
                }).addTo(map),
                isEstimated: n.isEstimated
            };
            
            mapElements[id].marker.bindTooltip(id, { permanent: false, direction: 'right', offset: [15, 0] });
            
        } else {
            const el = mapElements[id];
            
            // Update Marker Position smoothly
            el.marker.setLatLng([n.currentLat, n.currentLng]);
            
            // Update UI State if it swapped between verified/estimated
            if (el.isEstimated !== n.isEstimated) {
                const icon = L.divIcon({
                    html: `<div class="marker-wrapper ${colorClass} ${typeClass}"><div class="halo"></div><div class="core-dot"></div></div>`,
                    className: '',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });
                el.marker.setIcon(icon);
                el.isEstimated = n.isEstimated;
            }

            // Update Motion Trail
            const currentTrail = [...n.history, [n.currentLat, n.currentLng]];
            el.polyline.setLatLngs(currentTrail);
            
            // Re-style trail dynamically based on current prediction state
            el.polyline.setStyle({
                color: n.isEstimated ? '#ff5500' : '#00ff66',
                dashArray: n.isEstimated ? "5, 15" : ""
            });
        }
        
        // Follow cam
        if (config.focusedNode === id) {
            map.panTo([n.currentLat, n.currentLng], { animate: false });
        }
    });

    // Check visibility toggles
    updateVisibility();
    
    // Recursive call for 60fps smoothing
    requestAnimationFrame(renderLoop);
}

// ----------------------------------------------------
// Initialization
// ----------------------------------------------------
setInterval(fetchTelemetry, 1000); // Polling backend every second
requestAnimationFrame(renderLoop); // Running 60fps animations
