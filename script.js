// script.js
const REQUIRED_COLUMNS = ["SiteName", "SectorName", "Longitude", "Latitude", "Azimuth"];
const OPTIONAL_COLUMNS = ["RadiusCategory", "BeamCategory", "SiteColor", "ColorCode"]; 
let rawData = [];
let dataHeaders = [];

const fileInput = document.getElementById('fileInput');
const importButton = document.getElementById('importButton');
const exportButton = document.getElementById('exportButton');
const opacitySelect = document.getElementById('ColorOpacity');

// Checkbox Containers
const siteColumnsCheckboxesContainer = document.getElementById('siteColumnsCheckboxes');
const sectorColumnsCheckboxesContainer = document.getElementById('sectorColumnsCheckboxes');
const siteToggleBtn = document.getElementById('siteToggleBtn');
const sectorToggleBtn = document.getElementById('sectorToggleBtn');

// Mapping elements
const beamCategorySelect = document.getElementById('BeamCategory');
const radiusCategorySelect = document.getElementById('RadiusCategory');
const siteColorSelect = document.getElementById('SiteColor'); 
const sectorColorSelect = document.getElementById('ColorCode'); 

// Legend Containers
const beamValueLegendContainer = document.getElementById('beamValueLegendContainer');
const radiusValueLegendContainer = document.getElementById('radiusValueLegendContainer');
const siteColorLegendContainer = document.getElementById('siteColorLegendContainer');
const sectorColorLegendContainer = document.getElementById('sectorColorLegendContainer');

const ALL_COLUMN_SELECTS = document.querySelectorAll('.column-select');
const ALL_SELECT_WRAPPERS = document.querySelectorAll('.select-wrapper');

// Messaging Elements
const legendMessages = {
    'radiusValue': document.getElementById('radius_msg'),
    'beamValue': document.getElementById('beam_msg'),
    'siteColor': document.getElementById('site_color_msg'),
    'sectorColor': document.getElementById('sector_color_msg')
};

// --- Helper Functions ---

function hexToKMLColor(hexColor, opacityPct) {
    let alpha = Math.round((opacityPct / 100) * 255);
    let alphaHex = alpha.toString(16).padStart(2, '0').toUpperCase();
    hexColor = hexColor.replace("#", "");
    if (hexColor.length !== 6) return alphaHex + "FFFFFF";
    let R = hexColor.substring(0, 2);
    let G = hexColor.substring(2, 4);
    let B = hexColor.substring(4, 6);
    return alphaHex + B + G + R; // AABBGGRR format
}

function getSectorCoordinates(lon, lat, Azimuth, Radius, Beam) {
    // Constants for degree to meter conversion
    const LAT_CONV = 110540; 
    const LON_CONV = 111320 * Math.cos(lat * (Math.PI / 180)); 
    const RADIUS_LAT_DEG = Radius / LAT_CONV;
    const RADIUS_LON_DEG = Radius / LON_CONV;
    const ANGLE_STEP = Beam / 20; // 20 segments for the arc
    const RADIO_START = Azimuth - (Beam / 2);
    let coords = `${lon},${lat},0 `; // Start at center
    
    // Calculate arc coordinates
    for (let i = 0; i <= 20; i++) {
        let radioAngle = RADIO_START + i * ANGLE_STEP;
        // Convert Azimuth (North=0, increasing clockwise) to Math Angle (East=0, increasing counter-clockwise)
        let angleRad = (90 - radioAngle) * (Math.PI / 180); 
        let dx = RADIUS_LON_DEG * Math.cos(angleRad);
        let dy = RADIUS_LAT_DEG * Math.sin(angleRad);
        coords += `${(lon + dx).toFixed(6)},${(lat + dy).toFixed(6)},0 `;
    }
    coords += `${lon},${lat},0`; // Close the polygon back to center
    return coords;
}

function applySelectionStyle(selectElement) {
    const wrapper = document.getElementById('wrapper-' + selectElement.id);
    if (!wrapper) return;

    if (selectElement.value !== "") {
        wrapper.classList.add('dropdown-selected');
    } else {
        wrapper.classList.remove('dropdown-selected');
    }
}

window.toggleAllCheckboxes = function(type) {
    const container = type === 'site' ? siteColumnsCheckboxesContainer : sectorColumnsCheckboxesContainer;
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    // Check if any checkbox is unchecked; if so, check all. Otherwise, uncheck all.
    const shouldCheckAll = Array.from(checkboxes).some(cb => !cb.checked); 
    
    checkboxes.forEach(cb => {
        cb.checked = shouldCheckAll;
    });
}

// Reverting to previous color pool
const colorPool = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FFA500", "#800080", "#00FFFF", "#FFC0CB", "#3CB371", "#FFD700", "#DDA0DD", "#8B4513"];

/**
 * Generic function to generate category mapping inputs (Color or Text/Value).
 */
function generateCategoryLegend(type, inputType, defaultValue) {
    let selectElement, container, msgElement;
    
    if (type === 'siteColor') {
        selectElement = siteColorSelect; container = siteColorLegendContainer; msgElement = legendMessages['siteColor'];
    } else if (type === 'sectorColor') {
        selectElement = sectorColorSelect; container = sectorColorLegendContainer; msgElement = legendMessages['sectorColor'];
    } else if (type === 'beamValue') {
        selectElement = beamCategorySelect; container = beamValueLegendContainer; msgElement = legendMessages['beamValue'];
    } else if (type === 'radiusValue') {
        selectElement = radiusCategorySelect; container = radiusValueLegendContainer; msgElement = legendMessages['radiusValue'];
    } else {
        return;
    }

    // Preserve existing inputs/values before clearing
    const existingMap = getMapping(type);

    container.innerHTML = '';
    const selectedHeader = selectElement.value;
    
    if (!selectedHeader) {
        container.appendChild(msgElement);
        msgElement.classList.remove('hidden');
        return;
    } else {
        msgElement.classList.add('hidden');
    }

    // 1. Find all unique categories
    const categories = new Set();
    rawData.forEach(row => {
        const value = row[selectedHeader];
        if (value) {
            categories.add(String(value).trim());
        }
    });
    
    const categoryArray = Array.from(categories).sort();
    
    if (categoryArray.length === 0) {
         container.innerHTML = '<p class="text-sm text-red-500 col-span-full">Selected column contains no unique values to map.</p>';
         return;
    }

    // 2. Create an input for each category
    categoryArray.forEach((category, index) => {
        const className = inputType === 'color' ? 'color-input-container' : 'value-input-container';
        const idSuffix = category.replace(/[^a-zA-Z0-9]/g, '_');
        
        // 3. Determine the value to pre-fill
        let actualDefault = existingMap[category]; // Use existing value if available
        
        if (!actualDefault) { // If not existing, use a sensible default
            actualDefault = defaultValue;
            if (inputType === 'color') {
                actualDefault = colorPool[index % colorPool.length];
            } else if (inputType === 'text') {
                if (type === 'beamValue') {
                    if (category.toLowerCase().includes('60')) actualDefault = "60";
                    else if (category.toLowerCase().includes('30')) actualDefault = "30";
                    else if (category.toLowerCase().includes('33')) actualDefault = "33";
                    else if (category.toLowerCase().includes('45')) actualDefault = "45";
                    else actualDefault = "35";
                } else if (type === 'radiusValue') {
                    if (category.toLowerCase().includes('small')) actualDefault = "50";
                    else if (category.toLowerCase().includes('micro')) actualDefault = "80";
                    else if (category.toLowerCase().includes('pico')) actualDefault = "30";
                    else if (category.toLowerCase().includes('large')) actualDefault = "200";
                    else actualDefault = "120";
                }
            }
        }

        const div = document.createElement('div');
        div.className = className;
        div.innerHTML = `
            <label for="${type}-${idSuffix}">${category}</label>
            <input type="${inputType}" id="${type}-${idSuffix}" data-category="${category}" data-type="${type}" value="${actualDefault}">
        `;
        container.appendChild(div);
    });
}

/**
 * Retrieves the current user-defined mapping for a given type.
 */
function getMapping(type) {
    const map = {};
    let container;
    if (type === 'siteColor') container = siteColorLegendContainer;
    else if (type === 'sectorColor') container = sectorColorLegendContainer;
    else if (type === 'beamValue') container = beamValueLegendContainer;
    else if (type === 'radiusValue') container = radiusValueLegendContainer;
    else return {};

    const inputs = container.querySelectorAll(`input[data-type="${type}"]`);
    inputs.forEach(input => {
        const category = input.getAttribute('data-category');
        map[category] = input.value;
    });
    return map;
}

// --- Initial Setup ---

function setupUI() {
    // Populate Opacity Dropdown (0 to 100, step 10) - Note: HTML already contains the options, just ensure default
    opacitySelect.value = "50"; // Default opacity

    // Add change listener for styling and category regeneration
    ALL_COLUMN_SELECTS.forEach(select => {
        select.addEventListener('change', () => {
            applySelectionStyle(select);
            if (select.id === 'RadiusCategory') generateCategoryLegend('radiusValue', 'text', '120');
            if (select.id === 'BeamCategory') generateCategoryLegend('beamValue', 'text', '35');
            if (select.id === 'SiteColor') generateCategoryLegend('siteColor', 'color', '#008000');
            if (select.id === 'ColorCode') generateCategoryLegend('sectorColor', 'color', '#008000');
        });
    });
    
    // Initial call to ensure messages are displayed in empty category sections
    generateCategoryLegend('radiusValue', 'text', '120');
    generateCategoryLegend('beamValue', 'text', '35'); 
    generateCategoryLegend('siteColor', 'color', '#008000');
    generateCategoryLegend('sectorColor', 'color', '#008000');

    // Guide Modal Handlers
    const openGuideBtn = document.getElementById('open-guide');
    const guidePanel = document.getElementById('guide-panel');
    const closeGuideBtn = document.getElementById('close-guide');

    openGuideBtn.addEventListener('click', (e) => {
        e.preventDefault();
        guidePanel.classList.remove('hidden');
    });

    closeGuideBtn.addEventListener('click', () => {
        guidePanel.classList.add('hidden');
    });

    guidePanel.addEventListener('click', (e) => {
        if(e.target === guidePanel) {
            guidePanel.classList.add('hidden');
        }
    });
}

// --- Core Logic Functions (Import, Populate) ---

fileInput.addEventListener('change', () => {
    importButton.disabled = fileInput.files.length === 0;
    importButton.textContent = "Import Data";
    
    // Disable all controls and reset UI to pre-import state
    ALL_COLUMN_SELECTS.forEach(select => {
         select.value = "";
         select.disabled = true;
         applySelectionStyle(select);
    });
    ALL_SELECT_WRAPPERS.forEach(wrapper => wrapper.classList.add('disabled'));
    exportButton.disabled = true;
    siteToggleBtn.disabled = true;
    sectorToggleBtn.disabled = true;
    
    siteColumnsCheckboxesContainer.innerHTML = '<p class="text-sm text-gray-500">Import data to see column options.</p>';
    sectorColumnsCheckboxesContainer.innerHTML = '<p class="text-sm text-gray-500">Import data to see column options.</p>';
    
    setupUI(); 
});

importButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) return;

    // Papa Parse is assumed to be available globally via HTML script tag
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.data.length === 0) {
                alert("Error: File is empty or could not be parsed. Ensure the file is a CSV or text-based file with a header row.");
                return;
            }
            
            rawData = results.data.filter(row => Object.values(row).some(v => v !== '')); 
            dataHeaders = results.meta.fields;
            
            // Enable all selects and buttons
            ALL_COLUMN_SELECTS.forEach(select => select.disabled = false);
            ALL_SELECT_WRAPPERS.forEach(wrapper => wrapper.classList.remove('disabled'));
            exportButton.disabled = false;
            siteToggleBtn.disabled = false;
            sectorToggleBtn.disabled = false;

            populateDropdowns();
            populateCheckboxes();
            
            // Manually trigger the legend generation for all categories
            generateCategoryLegend('radiusValue', 'text', '120');
            generateCategoryLegend('beamValue', 'text', '35'); 
            generateCategoryLegend('siteColor', 'color', '#008000');
            generateCategoryLegend('sectorColor', 'color', '#008000');
            
            importButton.textContent = "Data Loaded!";
            importButton.disabled = true;

            ALL_COLUMN_SELECTS.forEach(applySelectionStyle);
        },
        error: function(error) {
            alert("Error parsing file: " + error.message + ". Check if the file format (CSV/TXT) is correct.");
        }
    });
});

function populateDropdowns() {
    const columnSelectIDs = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]; 
    const allSelects = columnSelectIDs.map(id => document.getElementById(id)).filter(e => e); 
    
    allSelects.forEach(select => {
        while (select.options.length > 0) { 
            select.remove(0); 
        }
        
        const promptOption = document.createElement('option');
        promptOption.value = "";
        promptOption.textContent = ""; 
        select.add(promptOption); 
    });

    dataHeaders.forEach(header => {
        allSelects.forEach(select => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            select.appendChild(option);
        });
    });

    // Attempt auto-mapping for required columns
    REQUIRED_COLUMNS.forEach(vbaName => {
        const headerMatch = dataHeaders.find(h => h.toLowerCase().includes(vbaName.toLowerCase()));
        if (headerMatch) {
            const selectElement = document.getElementById(vbaName);
            if (selectElement) {
                selectElement.value = headerMatch;
                applySelectionStyle(selectElement);
            }
        }
    });
}

function populateCheckboxes() {
    siteColumnsCheckboxesContainer.innerHTML = '';
    sectorColumnsCheckboxesContainer.innerHTML = '';

    dataHeaders.forEach(header => {
        let siteItem = document.createElement('label');
        siteItem.className = 'checkbox-item';
        siteItem.innerHTML = `<input type="checkbox" value="${header}" checked class="rounded text-indigo-600 focus:ring-indigo-500"> ${header}`;
        siteColumnsCheckboxesContainer.appendChild(siteItem);

        let sectorItem = document.createElement('label');
        sectorItem.className = 'checkbox-item';
        sectorItem.innerHTML = `<input type="checkbox" value="${header}" checked class="rounded text-indigo-600 focus:ring-indigo-500"> ${header}`;
        sectorColumnsCheckboxesContainer.appendChild(sectorItem);
    });
}

// --- KML Generation Logic ---
exportButton.addEventListener('click', generateAndDownloadKML);

function getSelectedCheckboxes(type) {
    const container = type === 'site' ? siteColumnsCheckboxesContainer : sectorColumnsCheckboxesContainer;
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
}

function generateAndDownloadKML() {
    // 1. Get Column Mappings and Values
    const mappings = {};
    REQUIRED_COLUMNS.concat(OPTIONAL_COLUMNS).forEach(id => {
        const element = document.getElementById(id);
        if (element) mappings[id] = element.value;
    });
    
    // Get user-defined maps
    const beamCategoryColumn = mappings.BeamCategory;
    const radiusCategoryColumn = mappings.RadiusCategory;
    
    const beamValueMap = getMapping('beamValue');
    const radiusValueMap = getMapping('radiusValue');
    const siteColorMap = getMapping('siteColor');
    const sectorColorMap = getMapping('sectorColor');

    // 2. Validation & Opacity Retrieval
    const requiredFields = ["SiteName", "SectorName", "Longitude", "Latitude", "Azimuth"];
    const requiredMapped = requiredFields.every(id => mappings[id]);
    
    if (!requiredMapped) {
        alert("ERROR: One or more required columns (SiteName, SectorName, Longitude, Latitude, Azimuth) are not mapped correctly.");
        return;
    }

    const opacityPct = parseFloat(opacitySelect.value);
    
    const selectedSectorCols = getSelectedCheckboxes('sector');
    const selectedSiteCols = getSelectedCheckboxes('site');
    
    // 3. KML Generation Boilerplate
    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document><name>Sector Coverage Export</name>
`;
    let siteIconsDict = {}; 
    
    // 4. Process Data Rows
    rawData.forEach(row => {
        const getValue = (header) => String(row[header] || '').trim();
        
        const site = getValue(mappings.SiteName);
        const sector = getValue(mappings.SectorName);
        const lon = parseFloat(getValue(mappings.Longitude));
        const lat = parseFloat(getValue(mappings.Latitude));
        const Azimuth = parseFloat(getValue(mappings.Azimuth) || 0);

        if (isNaN(lon) || isNaN(lat)) return;
        
        // --- Radius Logic ---
        let Radius = 120; 
        let radiusValueSource = "Default (120m)";
        
        if (radiusCategoryColumn) {
            const radiusCategory = getValue(radiusCategoryColumn);
            const mappedRadius = radiusValueMap[radiusCategory];
            if (mappedRadius && !isNaN(parseFloat(mappedRadius))) {
                Radius = parseFloat(mappedRadius);
                radiusValueSource = `Category: ${radiusCategory} (${Radius}m)`;
            } else if (radiusCategory) {
                radiusValueSource = `Category: ${radiusCategory} (Missing Map, using Default)`;
            }
        }
        
        if (isNaN(Radius) || Radius <= 0) {
            Radius = 120;
        }

        // --- Sector Beam Logic ---
        let Beam = 35; 
        let beamValueSource = "Default (35°)";

        if (beamCategoryColumn) {
            const beamCategory = getValue(beamCategoryColumn);
            const mappedBeam = beamValueMap[beamCategory];
            if (mappedBeam && !isNaN(parseFloat(mappedBeam))) {
                Beam = parseFloat(mappedBeam);
                beamValueSource = `Category: ${beamCategory} (${Beam}°)`;
            } else if (beamCategory) {
                beamValueSource = `Category: ${beamCategory} (Missing Map, using Default)`;
            }
        }
        
        if (isNaN(Beam) || Beam <= 0) {
            Beam = 35;
        }

        // --- Sector Polygon Color Logic ---
        const DEFAULT_SECTOR_COLOR = "#008000";
        let sectorKMLColor;
        let sectorCategoryValue;
        
        if (mappings.ColorCode) {
            sectorCategoryValue = getValue(mappings.ColorCode) || 'N/A (Blank Value)';
            const sectorBaseColor = sectorColorMap[sectorCategoryValue] || DEFAULT_SECTOR_COLOR; 
            sectorKMLColor = hexToKMLColor(sectorBaseColor, opacityPct);
        } else {
            sectorCategoryValue = "N/A (No Column)";
            sectorKMLColor = hexToKMLColor(DEFAULT_SECTOR_COLOR, opacityPct); 
        }

        const coords = getSectorCoordinates(lon, lat, Azimuth, Radius, Beam);

        // --- Sector Placemark (Polygon) ---
        let descText = `<![CDATA[<font style="font-size:8pt; font-family:Arial;"><b>Sector Information</b><br>`;
        descText += `Site = ${site}<br>`;
        descText += `Sector = ${sector}<br>`;
        descText += `Azimuth = ${Azimuth}<br>`;
        descText += `Beam = ${Beam}° (${beamValueSource})<br>`; 
        descText += `Radius = ${Radius}m (${radiusValueSource})<br>`; 
        descText += `Sector Color Category = ${sectorCategoryValue}<br>`; 
        
        // List other selected columns for pop-up
        const excludedHeaders = requiredFields.concat([mappings.ColorCode, mappings.BeamCategory, mappings.RadiusCategory, mappings.SiteColor]).filter(h => h);
        selectedSectorCols.forEach(header => {
            if (!excludedHeaders.includes(header) && getValue(header) !== '') {
                descText += `${header} = ${getValue(header) || 'N/A'}<br>`;
            }
        });
        descText += `</font>]]>`;
        
        kmlContent += `<Placemark><name>${sector}</name>
<description>${descText}</description>
<Style><LineStyle><color>${sectorKMLColor}</color><width>1.5</width></LineStyle><PolyStyle><color>${sectorKMLColor}</color></PolyStyle></Style>
<Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
`;

        // --- Site Icon Placemark (only place once per unique site) ---
        if (!siteIconsDict[site]) {
            siteIconsDict[site] = true;
            
            const DEFAULT_SITE_COLOR = "#008000";
            let siteKMLColor;
            let siteCategoryValue;
            
            if (mappings.SiteColor) {
                siteCategoryValue = getValue(mappings.SiteColor) || 'N/A (Blank Value)';
                const siteBaseColor = siteColorMap[siteCategoryValue] || DEFAULT_SITE_COLOR; 
                siteKMLColor = hexToKMLColor(siteBaseColor, 100); 
            } else {
                siteCategoryValue = "N/A (No Column)";
                siteKMLColor = hexToKMLColor(DEFAULT_SITE_COLOR, 100); 
            }

            const styleID = `siteStyle_${siteKMLColor.substring(2)}`;
            kmlContent += `
<Style id="${styleID}">
    <IconStyle><color>${siteKMLColor}</color><scale>1.0</scale><Icon><href>http://maps.google.com/mapfiles/kml/pal2/icon18.png</href></Icon></IconStyle>
</Style>
`;
            
            let siteDesc = `<![CDATA[<font style="font-size:8pt; font-family:Arial;"><b>Site Information</b><br>`;
            siteDesc += `Color Category = ${siteCategoryValue}<br>`; 
            
            const siteExcludedHeaders = requiredFields.concat([mappings.SiteColor]).filter(h => h);
            selectedSiteCols.forEach(header => {
                if (!siteExcludedHeaders.includes(header) && getValue(header) !== '') {
                   siteDesc += `${header} = ${getValue(header) || 'N/A'}<br>`;
                }
            });
            siteDesc += `</font>]]>`;

            kmlContent += `<Placemark><name>${site}</name>
<description>${siteDesc}</description>
<styleUrl>#${styleID}</styleUrl>
<Point><coordinates>${lon},${lat},0</coordinates></Point></Placemark>
`;
        }
    });
    
    kmlContent += `</Document></kml>`;

    // 5. Download Logic
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = 'sector_category_export.kml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Run Setup on Load ---
document.addEventListener('DOMContentLoaded', setupUI);