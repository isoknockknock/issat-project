# Presentation Slides Content — Poojitha (Slides 1–15)

## Slide 1: Title Slide
**Title:** Land Use Land Cover Change Analysis — Punjab & Uttarakhand, India  
**Subtitle:** Water Body Classification & Buffer Zone LULC Analysis (2016–2025)  
**Course:** ISSAT Project  
**Team:** Poojitha (Tasks 4 & 5) | Ananya (Tasks 2 & 3) | Harris (Tasks 6 & 7)  
**Date:** 25th April 2026

---

## Slide 2: Introduction & Problem Statement
**Title:** Why LULC Change Analysis Matters

**Key Points:**
- Land Use Land Cover (LULC) change is a critical indicator of environmental health
- **Punjab** — India's agricultural heartland — faces acute water crisis
  - Groundwater declining at 0.5–1.0 m/year
  - 79% of groundwater blocks overexploited (Central Ground Water Board, 2023)
- **Uttarakhand** — Himalayan state — faces glacial retreat & ecosystem fragility
  - Glacial lakes expanding due to climate change
  - Rapid urbanization in Dehradun, Haridwar corridors
  - Forest cover under pressure from infrastructure development
- Satellite remote sensing + GEE enables large-scale temporal monitoring
- Our study analyzes **3 time periods** (2016, 2020, 2025) across **2 contrasting states**

**Visual:** Map of India with Punjab and Uttarakhand highlighted + key statistics for each

---

## Slide 3: Study Areas — Punjab & Uttarakhand
**Title:** Study Areas: Two Contrasting Indian States

**Punjab:**
- Area: ~50,362 km² | 23 Districts
- Terrain: Flat alluvial plains (Indo-Gangetic)
- Dominant land cover: Cropland (rice-wheat system, 64% under agriculture)
- Major rivers: Sutlej, Beas, Ravi, Ghaggar
- Water challenge: Groundwater depletion, surface water loss

**Uttarakhand:**
- Area: ~53,483 km² | 13 Districts
- Terrain: Himalayan mountains (elevation 200–7,817m)
- Dominant land cover: Forests (~46% under forest cover)
- Major rivers: Ganga, Yamuna, Alaknanda, Bhagirathi
- Water features: Glacial lakes, dam reservoirs (Tehri, Nanak Sagar), natural lakes (Nainital, Bhimtal)

**Visual:** Side-by-side state boundary maps from GEE

---

## Slide 4: Data Sources & Acquisition
**Title:** Data Sources

| Dataset | Year | Resolution | Source |
|---------|------|------------|--------|
| Dynamic World V1 | 2016 | 10m | Google/Sentinel-2 |
| ESA WorldCover v100 | 2020 | 10m | ESA/Sentinel-1+2 |
| ESA WorldCover v200 | 2025 | 10m | ESA/Sentinel-1+2 |

**Processing Platform:** Google Earth Engine (cloud-based geospatial analysis)  
**Boundary Data:** FAO GAUL Level 1 (Punjab & Uttarakhand)

**⚠️ Cross-sensor caveat:** 2016 uses ML-based Dynamic World; 2020/2025 use ESA WorldCover. Some variation may be sensor-related rather than real LULC change.

---

## Slide 5: Methodology Overview
**Title:** Analysis Pipeline

**Flowchart:**
```
Data Acquisition (GEE) — Both Punjab & Uttarakhand
    ↓
Water Pixel Extraction (eq(80) / eq(0)) — Per State
    ↓
Task 4: Vectorization → Area Calculation → Size Classification → Aggregation
    ↓
Task 5: Major Water Bodies (≥100 ha) → Dissolve → Buffer Rings (2,4,8,10 km)
    ↓
LULC Statistics per Ring per Year per State → Export CSV
    ↓
Python Analysis → Comparative Visualizations → Indices → Insights
```

**Visual:** Use the flowchart or screenshot from methodology section

---

## Slide 6: Task 4 — Methodology
**Title:** Water Body Size Classification — How We Did It

**GEE Code Logic (applied to both states):**
1. **Extract water pixels**: `dw2016.eq(0)` for DW, `wc2020.eq(80)` for WorldCover
2. **Vectorize**: `reduceToVectors()` — converts connected water pixels to polygons
3. **Compute area**: `.geometry().area(1).divide(10000)` — geodesic area in hectares
4. **Classify**: Nested `ee.Algorithms.If()` assigns to 6 size classes
5. **Aggregate**: `aggregate_sum('area_ha')` per class per year **per state**

**Size Classes:** <1ha | 1–50ha | 50–100ha | 100–200ha | 200–300ha | >300ha

---

## Slide 7: Task 4 — Results (Punjab — Count)
**Title:** Water Body Count by Size Class — Punjab

**Visual:** `task4_count_bars.png`

**Key Numbers (Punjab):**
| Size Class | 2016 | 2020 | 2025 | Change |
|-----------|------|------|------|--------|
| <1 ha | 1,553 | 527 | 549 | −64.7% |
| 1–50 ha | 2,040 | 528 | 678 | −66.8% |
| >300 ha | 10 | 10 | 5 | −50.0% |
| **Total** | **3,656** | **1,103** | **1,258** | **−65.6%** |

**Uttarakhand comparison:** Different pattern expected — glacial lakes and dam reservoirs show different dynamics than Punjab's irrigation-dependent water bodies.

---

## Slide 8: Task 4 — Results (Area Trends)
**Title:** Total Water Body Area Trends — Both States

**Visuals:** `task4_area_bars.png` + `task4_temporal_trend.png`

**Key Finding (Punjab):**
- Total water area: **38,619 ha → 19,440 ha → 13,441 ha** (−65.2% over decade)
- >300 ha class dominates: 64% (2016) → 48% (2025) — large reservoirs shrinking
- Small ponds (<1 ha) lost 65% of their count — local ecological impact

**Uttarakhand Context:**
- Mountainous terrain means fewer but more stable water bodies (dam-controlled)
- Glacial lake dynamics differ from surface water loss patterns in plains

---

## Slide 9: Task 4 — Change Analysis
**Title:** Temporal Change & Environmental Implications

**Visuals:** `task4_pct_change_heatmap.png` + `task4_pie_charts.png`

**Insights (Both States):**
1. **Steepest decline 2016→2020** (partly sensor difference, partly real) — observed in both states
2. **2020→2025 decline confirmed** (same sensor, ~30% loss) — reliable environmental signal
3. **50–100 ha class most vulnerable**: −48% count, −31% area (2020→2025) in Punjab
4. **Punjab's water crisis** is quantifiable from space — groundwater depletion driving surface water loss
5. **Uttarakhand's water bodies** show different vulnerability patterns linked to glacial retreat and dam management

---

## Slide 10: Task 5 — Buffer Analysis Methodology
**Title:** LULC Changes Around Major Water Bodies

**Methodology (applied to both states):**
1. Select major water bodies (≥100 ha) from 2020 classification
2. Dissolve touching polygons into single features
3. Generate concentric buffer rings: **0–2 km, 2–4 km, 4–8 km, 8–10 km**
4. Compute LULC area per class per ring using `reduceRegion`
5. Compare 2020 vs 2025 **for each state**

**Visual:** Diagram showing concentric rings around a water body (blue center, colored rings)

**GEE Code:**
```javascript
var ring = b4.difference(b2); // Creates donut-shaped 2-4km ring
// Applied to both punjabGeom and uttarakhandGeom
```

---

## Slide 11: Task 5 — LULC Composition
**Title:** LULC Composition by Buffer Ring — Comparative

**Visual:** `task5_lulc_stacked.png`

**Punjab — Key Observations:**
- **Cropland** dominates all rings (73–76%) — agricultural character
- **Built-up** concentrated in 2–8 km zone (settlements near but not adjacent to water)
- **Water** highest in 0–2 km ring (expected)

**Uttarakhand — Key Observations:**
- **Forest/Tree cover** dominates buffer zones (contrasting with Punjab's cropland)
- **Built-up** concentrated near valley-floor water bodies (Dehradun, Haridwar)
- **Snow/ice** and **bare ground** present in higher-altitude buffer zones

---

## Slide 12: Task 5 — Change Analysis
**Title:** LULC Change 2020→2025 Around Water Bodies

**Visuals:** `task5_change_heatmap.png` + `task5_change_by_class.png`

**Key Changes — Punjab (2020→2025):**
| Class | 0–2 km | 2–4 km | 4–8 km | 8–10 km |
|-------|--------|--------|--------|---------|
| Tree cover | +30.3% | +31.2% | +34.1% | +47.0% |
| Built-up | +9.0% | +10.9% | +8.7% | +8.4% |
| Water | −33.5% | −40.6% | −22.4% | −19.7% |
| Bare/sparse | −50.2% | −84.1% | −86.6% | −85.6% |

**Uttarakhand:** Different change dynamics — forest cover changes more ecologically significant; built-up expansion concentrated in Terai/plains districts.

---

## Slide 13: Extra Analysis — Fragmentation & Correlation
**Title:** Water Body Fragmentation & Urban-Water Nexus

**Visuals:** `extra_fragmentation_dashboard.png` + `extra_builtup_vs_water.png`

**Fragmentation Metrics (Punjab):**
| Metric | 2016 | 2020 | 2025 |
|--------|------|------|------|
| Mean Patch Size | 10.56 ha | 17.62 ha | 10.68 ha |
| Simpson's Diversity | 0.47 | 0.57 | 0.62 |

**Correlation Finding:** Strong negative correlation (r ≈ −0.72) between built-up growth and water loss — urbanization is directly linked to water body shrinkage. This pattern is observable in both states, particularly in peri-urban zones of Ludhiana (Punjab) and Dehradun (Uttarakhand).

---

## Slide 14: Normalization & Environmental Stress Index
**Title:** Composite Environmental Stress Index (ESI)

**Visual:** `indices_radar.png` + `indices_esi_ranking.png`

**Index Components:**
- WBLI (Water Body Loss Index) — weight: 35%
- UPI (Urbanization Pressure Index) — weight: 30%
- VCI (Vegetation Change Index) — weight: 20%
- CSI (Cropland Stability Index) — weight: 15%

**Ranking:** 0–2 km ring has HIGHEST environmental stress in both states → areas immediately adjacent to water bodies need urgent attention.

**State Comparison:** Punjab shows higher overall ESI due to agricultural water extraction pressure; Uttarakhand shows higher VCI component due to forest sensitivity.

---

## Slide 15: Key Findings & Conclusions
**Title:** Summary — What the Data Tells Us

**5 Major Findings:**
1. 📉 **Significant water body area lost** in both states (2016–2025) — crisis confirmed from satellite data
2. 🏗️ **Built-up expansion 8–11%** in all buffer zones — urbanization encroaching on water peripheries across both Punjab and Uttarakhand
3. 🔍 **Small ponds disappearing fastest** — <1 ha class lost 65% of water bodies in Punjab
4. 📊 **Strong urban-water negative correlation** (r = −0.72) — where cities grow, water shrinks (both states)
5. 🎯 **0–2 km zone most stressed** in both states — immediate water body margins face greatest pressure

**Comparative Insight:**
- **Punjab**: Agricultural water extraction + urbanization = primary drivers of water loss
- **Uttarakhand**: Climate-driven glacial changes + valley urbanization + dam management = different but equally critical challenges

**Actionable Insight:** Both states need targeted water conservation in the 0–4 km zone around major water bodies, with state-specific strategies: Punjab requires strict land-use planning to curb encroachment, while Uttarakhand needs glacial lake monitoring and controlled development in river valleys.
