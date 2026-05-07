# Comprehensive Land Use Land Cover (LULC) Change Analysis Report
**Focus:** Task 4 (Water Body Size Classification) and Task 5 (Buffer Zone LULC Analysis)  
**Study Areas:** Punjab & Uttarakhand, India  
**Time Periods:** 2016, 2020, and 2025  
**Author:** Poojitha (Tasks 4 & 5)

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Introduction & Problem Statement](#2-introduction--problem-statement)
3. [Study Areas: Two Contrasting Landscapes](#3-study-areas-two-contrasting-landscapes)
4. [Data Sources & Methodology](#4-data-sources--methodology)
5. [Task 4: Water Body Size Classification & Trends](#5-task-4-water-body-size-classification--trends)
6. [Task 5: Buffer Analysis Around Major Water Bodies](#6-task-5-buffer-analysis-around-major-water-bodies)
7. [Advanced Analysis: Urban-Water Nexus & Fragmentation](#7-advanced-analysis-urban-water-nexus--fragmentation)
8. [Environmental Stress Index (ESI) & Normalization](#8-environmental-stress-index-esi--normalization)
9. [Data Validation & Reliability](#9-data-validation--reliability)
10. [Key Findings & Policy Recommendations](#10-key-findings--policy-recommendations)

---

## 1. Executive Summary
This study provides a decade-long (2016–2025) assessment of Land Use Land Cover (LULC) changes in Punjab and Uttarakhand, specifically targeting water body dynamics and urban encroachment. Using a consistent **Google Dynamic World V1** dataset, we identified a critical 65.2% decline in surface water area in Punjab. The analysis confirms a strong negative correlation (r = -0.72) between urbanization and water availability. The 0–2 km buffer zone around major water bodies was identified as the most environmentally stressed region, requiring immediate policy intervention to prevent further degradation of vital natural resources.

---

## 2. Introduction & Problem Statement
Land Use Land Cover (LULC) change is a critical indicator of environmental health. This study focuses on two contrasting Indian states—Punjab and Uttarakhand—to monitor temporal changes in water bodies and surrounding land use over a decade (2016–2025).

*   **Punjab (India's Agricultural Heartland):** Faces an acute water crisis with groundwater declining at 0.5–1.0 m/year. According to the Central Ground Water Board (2023), 79% of groundwater blocks are overexploited.
*   **Uttarakhand (Himalayan State):** Faces glacial retreat and ecosystem fragility. Glacial lakes are expanding due to climate change, while rapid urbanization in corridors like Dehradun and Haridwar puts pressure on forest cover.

Satellite remote sensing combined with Google Earth Engine (GEE) enables large-scale temporal monitoring of these dynamics.

---

## 3. Study Areas: Two Contrasting Landscapes

### 3.1 State Profiles
Punjab and Uttarakhand represent two very different geographical and ecological contexts:

*   **Punjab:** Approximately 50,362 km² of flat alluvial plains. It is dominated by a rice-wheat agricultural system (64% under agriculture). Major rivers include the Sutlej, Beas, Ravi, and Ghaggar. The primary challenge here is surface water loss and groundwater depletion.
*   **Uttarakhand:** Approximately 53,483 km² of mountainous Himalayan terrain. Forest cover is dominant (~46%). It features diverse water bodies including glacial lakes, natural lakes (Nainital), and large reservoirs (Tehri).

![Comparative State Profile](45_figures/comp_state_profile.png)
*Figure 1: Comparative LULC DNA of Punjab and Uttarakhand, showcasing the stark contrast between Punjab's cropland dominance and Uttarakhand's forest-heavy landscape.*

---

## 4. Data Sources & Methodology

### 4.1 Data Acquisition
To ensure complete scientific accuracy and eliminate cross-sensor variance, we exclusively used the **Google Dynamic World V1** dataset (10m resolution) for all three years (2016, 2020, and 2025). 

| Dataset | Year | Resolution | Source |
|---------|------|------------|--------|
| Dynamic World V1 | 2016 | 10m | Google/Sentinel-2 |
| Dynamic World V1 | 2020 | 10m | Google/Sentinel-2 |
| Dynamic World V1 | 2025 | 10m | Google/Sentinel-2 |

### 4.2 Analysis Pipeline
The analysis was conducted using Google Earth Engine for spatial processing and Python for statistical visualization.

1.  **Water Pixel Extraction:** Isolate water pixels using the Dynamic World classification.
2.  **Task 4 (Size Classification):** Vectorize water pixels, calculate area in hectares, and classify into six size classes: `<1ha, 1–50ha, 50–100ha, 100–200ha, 200–300ha, >300ha`.
3.  **Task 5 (Buffer Analysis):** Select major water bodies (≥100 ha), generate concentric buffer rings (0–2, 2–4, 4–8, 10 km), and compute LULC statistics for each ring across the time periods.

---

## 5. Task 4: Water Body Size Classification & Trends

### 5.1 Temporal Trends in Water Area
The study reveals a significant decline in surface water area across both states.

![Water Area Trends Comparison](45_figures/comp_water_trends.png)
*Figure 2: Total water area trends comparing Punjab and Uttarakhand. Both states show a downward trajectory, but Punjab's decline is more precipitous.*

![Temporal Trend Over a Decade](45_figures/task4_temporal_trend.png)
*Figure 3: Detailed temporal trend lines for water area loss from 2016 to 2025.*

**Key Data (Punjab Trends):**
| Metric | 2016 | 2020 | 2025 | Total Change |
|--------|------|------|------|--------------|
| Total Area (ha) | 38,619 | 19,440 | 13,441 | -65.2% |
| Water Body Count | 3,656 | 1,103 | 1,258 | -65.6% |

### 5.2 Size Class Distribution
Analyzing water bodies by size provides insights into local vs. regional ecological health.

![Water Body Count by Size Class](45_figures/task4_count_bars.png)
*Figure 4: Bar chart showing the number of water bodies in each size class. The count of small water bodies has plummeted in Punjab.*

![Area Distribution by Size Class](45_figures/task4_area_bars.png)
*Figure 5: Total area contributed by each size class.*

![Stacked Area Distribution](45_figures/task4_stacked_area.png)
*Figure 6: Proportional area held by different size classes over time.*

![Water Body Size Shift](45_figures/extra_size_shift.png)
*Figure 7: Analysis of how water bodies have shifted between size classes.*

**Size Class Breakdown (Punjab 2016–2025):**
| Size Class | Count (2016) | Count (2025) | % Change in Count |
|-----------|--------------|--------------|-------------------|
| <1 ha | 1,553 | 549 | -64.7% |
| 1–50 ha | 2,040 | 678 | -66.8% |
| >300 ha | 10 | 5 | -50.0% |

### 5.3 Change Analysis Heatmaps
![Percentage Change Heatmap](45_figures/task4_pct_change_heatmap.png)
*Figure 8: Heatmap showing percentage change in area/count. The 50–100 ha class shows significant vulnerability.*

![Size Class Pie Charts](45_figures/task4_pie_charts.png)
*Figure 9: Pie charts illustrating the proportional area of each size class across the study years.*

---

## 6. Task 5: Buffer Analysis Around Major Water Bodies

### 6.1 LULC Composition in Buffer Zones
![LULC Composition by Buffer Ring](45_figures/task5_lulc_stacked.png)
*Figure 10: Proportional land use within concentric rings.*

![Radar Chart of LULC Buffer](45_figures/task5_radar.png)
*Figure 11: Intensity of different land use classes across the buffer rings.*

**State Comparisons:**
*   **Punjab:** Cropland dominates all rings (~75%).
*   **Uttarakhand:** Tree cover and forests are the dominant LULC classes near water.

### 6.2 LULC Change Analysis (2016–2025)
![Change by LULC Class](45_figures/task5_change_by_class.png)
*Figure 12: Absolute change in hectares for each LULC class within each buffer ring.*

![Buffer Change Heatmap](45_figures/task5_change_heatmap.png)
*Figure 13: Heatmap of LULC changes, showing the rapid increase in built-up areas.*

**Decadal Changes in Punjab Buffer Zones (2016–2025):**
| LULC Class | 0–2 km | 2–4 km | 4–8 km | 8–10 km |
|------------|--------|--------|--------|---------|
| Built-up | +15.6% | +17.5% | +18.1% | +16.3% |
| Tree cover | -3.3% | +4.6% | +9.6% | +15.5% |
| Bare Ground | +4.1% | -79.7% | -84.8% | -87.1% |

---

## 7. Advanced Analysis: Urban-Water Nexus & Fragmentation

### 7.1 Urban Encroachment Dynamics
![Comparative Urban Heatmap](45_figures/comp_urban_heatmap.png)
*Figure 14: Hotspots of urban growth relative to water bodies.*

![Built-up Growth vs. Water Loss](45_figures/extra_builtup_vs_water.png)
*Figure 15: Strong negative correlation (r ≈ −0.72) between urbanization and water area.*

### 7.2 Fragmentation Metrics
![Fragmentation Dashboard](45_figures/extra_fragmentation_dashboard.png)
*Figure 16: Metrics like Mean Patch Size and Simpson's Diversity Index.*

---

## 8. Environmental Stress Index (ESI) & Normalization
![ESI Ranking by Ring](45_figures/indices_esi_ranking.png)
*Figure 17: Ranking of buffer rings. The 0–2 km ring is consistently the most stressed.*

![Indices Radar Chart](45_figures/indices_radar.png)
*Figure 18: Comparison of ESI components (WBLI, UPI, VCI, CSI).*

![All Indices Bar Chart](45_figures/indices_all_bars.png)
*Figure 19: Comparative bars for all calculated indices.*

![Temporal Index Trends](45_figures/indices_temporal.png)
*Figure 20: Evolution of environmental stress over the study period.*

---

## 9. Data Validation & Reliability
![Cross-Sensor Validation](45_figures/validation_cross_sensor.png)
*Figure 21: Proof of methodological consistency using Dynamic World.*

![Known Water Body Validation](45_figures/validation_known_wb.png)
*Figure 22: Comparison with ground-truth data for major reservoirs.*

![Temporal Validation](45_figures/validation_temporal.png)
*Figure 23: Validation against external hydrological reports.*

![Consolidated Temporal Validation](45_figures/validation_temporal_both.png)
*Figure 24: Consistent trends across both states.*

---

## 10. Key Findings & Policy Recommendations

### 10.1 Summary of Findings
1.  **Significant Water Loss:** Both states show a measurable decline in surface water area from 2016 to 2025. Punjab's loss of ~65% is particularly alarming.
2.  **Rapid Urbanization:** Built-up area expanded by 15–18% within 10 km of major water bodies, directly encroaching on natural margins.
3.  **Small Pond Crisis:** Small water bodies (<1 ha) are disappearing at the fastest rate, threatening local ecosystems.
4.  **Urban-Water Nexus:** A strong negative correlation (r = −0.72) confirms that urbanization is a primary driver of water shrinkage.
5.  **The 0–2 km Danger Zone:** The areas immediately adjacent to water bodies face the highest environmental stress (ESI).

### 10.2 Policy Recommendations

*   **For Punjab (Agricultural Focus):**
    *   **Enforce Buffer Zoning:** Strictly prohibit new construction within the 0–2 km margin of identified major water bodies.
    *   **Pond Restoration:** Launch a state-wide initiative to restore small ponds (<1 ha) to aid groundwater recharge and local biodiversity.
    *   **Water Intensity Management:** Regulate agricultural water extraction near receding reservoirs to maintain minimum ecological flows.

*   **For Uttarakhand (Ecological Focus):**
    *   **Glacial Lake Monitoring:** Establish a real-time satellite monitoring system for glacial lakes showing area expansion due to climate change.
    *   **Sustainable Urban Corridors:** Direct urbanization in Dehradun and Haridwar away from forested water catchments.
    *   **Dam Management:** Optimize seasonal release schedules for major dams (Tehri, etc.) to mitigate downstream surface water volatility.

**Final Verdict:** The study underscores the need for state-specific water management. Urban growth must be decoupled from water body degradation to ensure future resource security.
