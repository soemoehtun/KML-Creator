# 📘 KML Sector Beam/Radius Exporter – User Guide

This tool allows telecom engineers to import sector/site data (**CSV/TXT**), map the required columns, assign **beamwidth + radius** values, define **colors**, and export **Google Earth KML** files showing sector polygons and site markers.

---

## 1️⃣ Purpose of the Tool

The tool is designed to:

- Visualize **sector coverage** in Google Earth  
- Generate **beam-shaped polygons** based on azimuth, radius, and beamwidth  
- Assign **colors** based on category (sector/site)  
- Display site-wise and sector-wise **attributes** in Google Earth pop-ups  
- Export **high-quality KML files** for planning, optimization, and reporting  

---

## 2️⃣ Preparing Your Input File

Your input file must be:

- **CSV** or **TXT**
- Contains a **header row**
- Rows may include additional KPIs/fields

### ✔ Required Columns (Must be mapped)

- `SiteName`  
- `SectorName`  
- `Longitude`  
- `Latitude`  
- `Azimuth`  

### ⭕ Optional Columns (If available)

- `BeamCategory`
- `RadiusCategory`
- `SiteColor`
- `SectorColor` / `ColorCode`

> The tool still works without optional columns (defaults will be used).

---

## 3️⃣ Step-by-Step Usage Guide

### Step 1: Import CSV/TXT File

1. Click the file browser  
2. Select your CSV or TXT file  
3. Click **Import Data**

After import:

- ✔ All dropdowns activate  
- ✔ Category mapping sections are enabled  
- ✔ Pop-up column selectors appear  

---

### Step 2: Column Mapping

Map your CSV/TXT headers to the required fields:

| Required Field | Maps To |
|----------------|---------|
| `SiteName` | Site name column |
| `SectorName` | Sector ID or sector code |
| `Longitude` | Decimal longitude |
| `Latitude` | Decimal latitude |
| `Azimuth` | 0–360° |

The tool validates all selected fields.

---

### Step 3: Assign Beam Values (Optional)

If `BeamCategory` exists:

1. Select beam category column  
2. Tool auto-detects all unique categories  
3. Assign **beamwidth (°)** for each category  

If no category is mapped:  
✔ **Default beamwidth = 35°**

---

### Step 4: Assign Radius Values (Optional)

If `RadiusCategory` exists:

1. Select column  
2. Unique categories appear  
3. Assign **radius in meters** for each  

If not mapped:  
✔ **Default radius = 120 m**

---

### Step 5: Define Site & Sector Colors

If your file includes:

- `SiteColor`
- `SectorColor` / `ColorCode`

You can map:

- Site categories → **marker icon color**  
- Sector categories → **polygon color**  

Opacity range: **10–100%**

Colors automatically convert to **KML AABBGGRR** format.

---

### Step 6: Select Pop-up Columns

Two independent selectors:

**Site Pop-up Fields**
- Example: Region, Vendor, Bandwidth, Site Type  

**Sector Pop-up Fields**
- Example: PCI, TAC, CellID, RSRP_avg, Traffic  

Includes **Select All / Unselect All** buttons.

---

### Step 7: Export the KML File

Click:

```text
Export KML File
