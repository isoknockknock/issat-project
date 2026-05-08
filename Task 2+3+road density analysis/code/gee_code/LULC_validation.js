/***********************************************************************
 * GEE VISUAL VALIDATION — 5 CLASS + SEASONAL
 * Seasons: Rabi (Jan-Mar), Pre-Monsoon (Apr-Jun),
 *          Kharif (Jul-Sep), Post-Monsoon (Oct-Dec)
 * States: Punjab & Uttarakhand | Years: 2016, 2020, 2025
 ***********************************************************************/

// ============================================================
// 1. BOUNDARIES
// ============================================================
var districts = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level2');

var punjab = districts
  .filter(ee.Filter.eq('ADM0_NAME', 'India'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Punjab'));

var uttarakhand = districts
  .filter(ee.Filter.eq('ADM0_NAME', 'India'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Uttarakhand'));

// ============================================================
// 2. PASTE YOUR TASK 9 FLAGGED DISTRICTS HERE
// ============================================================
var punjabFlaggedDistricts      = ['Ludhiana', 'Patiala'];
var uttarakhandFlaggedDistricts = ['Haridwar', 'Dehradun'];

// ============================================================
// 3. PASTE YOUR TOP CHANGE DISTRICTS HERE
// ============================================================
var punjabTopChange      = ['Amritsar', 'Jalandhar', 'Gurdaspur', 'Firozpur', 'Bathinda'];
var uttarakhandTopChange = ['Dehradun', 'Udham Singh Nagar', 'Nainital', 'Haridwar', 'Pauri Garhwal'];

// ============================================================
// 4. SEASONS DEFINITION
//    Chosen to match Indian agricultural calendar:
//    Rabi        = Jan-Mar  (winter crop growing season)
//    Pre-Monsoon = Apr-Jun  (dry season, crop harvest)
//    Kharif      = Jul-Sep  (monsoon, summer crop growing)
//    Post-Monsoon= Oct-Dec  (retreat monsoon, rabi sowing)
// ============================================================
var seasons = [
  {name: 'Rabi',         shortName: 'Rabi',    startMonth: 1,  endMonth: 3},
  {name: 'Pre-Monsoon',  shortName: 'PreMon',  startMonth: 4,  endMonth: 6},
  {name: 'Kharif',       shortName: 'Kharif',  startMonth: 7,  endMonth: 9},
  {name: 'Post-Monsoon', shortName: 'PostMon', startMonth: 10, endMonth: 12}
];

var years = [2016, 2020, 2025];

// ============================================================
// 5. LULC — 5-CLASS SEASONAL FUNCTION
//    Uses only images from within that season's months
// ============================================================
var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1');

function getSeasonalLULC(year, startMonth, endMonth, region) {
  var start = ee.Date.fromYMD(year, startMonth, 1);
  var end   = ee.Date.fromYMD(year, endMonth,   28);

  var label = dw.filterDate(start, end)
    .filterBounds(region)
    .select('label')
    .reduce(ee.Reducer.mode());

  return label.remap(
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
    [3, 1, 1, 1, 2, 1, 4, 5, 0]
  ).selfMask()
   .rename('label')
   .clip(region);
}

// ============================================================
// 6. SENTINEL-2 SEASONAL FUNCTION
// ============================================================
function getSeasonalS2(year, startMonth, endMonth, region) {
  var start = ee.Date.fromYMD(year, startMonth, 1);
  var end   = ee.Date.fromYMD(year, endMonth,   28);

  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(start, end)
    .filterBounds(region)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .median()
    .clip(region);
}

// ============================================================
// 7. VISUALISATION PARAMS
// ============================================================
var lulcVis = {
  min: 1, max: 5,
  palette: [
    '#397D49',  // 1 - Vegetation
    '#E49635',  // 2 - Cropland
    '#419BDF',  // 3 - Water
    '#C4281B',  // 4 - Built-up
    '#A59B8F'   // 5 - Barren/Bare
  ]
};

var s2Vis = {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000};

// ============================================================
// 8. BUILD AND ADD ALL SEASONAL LAYERS
//    Naming convention:
//    "Punjab | LULC 2016 Rabi"
//    "Punjab | Satellite 2016 Rabi"
//    All layers OFF by default except 2025 Post-Monsoon
// ============================================================

// Store all LULC images for click inspector and change detection
var lulcStore = {punjab: {}, uttarakhand: {}};

years.forEach(function(year) {
  seasons.forEach(function(season) {

    var isDefault = (year === 2025 && season.shortName === 'PostMon');

    // --- PUNJAB ---
    var pLULC = getSeasonalLULC(year, season.startMonth, season.endMonth, punjab);
    var pS2   = getSeasonalS2(year, season.startMonth, season.endMonth, punjab);

    Map.addLayer(pS2,   s2Vis,   'Punjab | Satellite ' + year + ' ' + season.name, false);
    Map.addLayer(pLULC, lulcVis, 'Punjab | LULC '      + year + ' ' + season.name, isDefault);

    // Store for inspector
    if (!lulcStore.punjab[year]) lulcStore.punjab[year] = {};
    lulcStore.punjab[year][season.shortName] = pLULC;

    // --- UTTARAKHAND ---
    var uLULC = getSeasonalLULC(year, season.startMonth, season.endMonth, uttarakhand);
    var uS2   = getSeasonalS2(year, season.startMonth, season.endMonth, uttarakhand);

    Map.addLayer(uS2,   s2Vis,   'Uttarakhand | Satellite ' + year + ' ' + season.name, false);
    Map.addLayer(uLULC, lulcVis, 'Uttarakhand | LULC '      + year + ' ' + season.name, isDefault);

    if (!lulcStore.uttarakhand[year]) lulcStore.uttarakhand[year] = {};
    lulcStore.uttarakhand[year][season.shortName] = uLULC;
  });
});

// ============================================================
// 9. CHANGED PIXELS LAYERS
//    One per season comparing 2016 vs 2025
//    Useful for spotting if change is season-specific (noise)
//    vs persistent across all seasons (real change)
// ============================================================
seasons.forEach(function(season) {
  var pChanged = lulcStore.punjab[2016][season.shortName]
    .neq(lulcStore.punjab[2025][season.shortName]).selfMask();
  var uChanged = lulcStore.uttarakhand[2016][season.shortName]
    .neq(lulcStore.uttarakhand[2025][season.shortName]).selfMask();

  Map.addLayer(pChanged, {palette: ['FFFF00']},
    'Punjab | Changed pixels ' + season.name + ' (2016 vs 2025)', false);
  Map.addLayer(uChanged, {palette: ['FFFF00']},
    'Uttarakhand | Changed pixels ' + season.name + ' (2016 vs 2025)', false);
});

// ============================================================
// 10. DISTRICT BOUNDARIES
// ============================================================
function styleDistricts(districtFC, flaggedList, topChangeList) {
  return {
    normal: districtFC.style({
      color: 'ffffff', fillColor: '00000000', width: 0.8
    }),
    flagged: districtFC
      .filter(ee.Filter.inList('ADM2_NAME', flaggedList))
      .style({color: 'FF0000', fillColor: 'FF000033', width: 2.5}),
    topChange: districtFC
      .filter(ee.Filter.inList('ADM2_NAME', topChangeList))
      .style({color: 'FF8C00', fillColor: 'FF8C0033', width: 2.5})
  };
}

var punjabStyles      = styleDistricts(punjab,      punjabFlaggedDistricts,      punjabTopChange);
var uttarakhandStyles = styleDistricts(uttarakhand, uttarakhandFlaggedDistricts, uttarakhandTopChange);

Map.addLayer(punjabStyles.normal,         {}, 'Punjab | All boundaries',               true);
Map.addLayer(punjabStyles.topChange,      {}, 'Punjab | Top change districts (orange)', true);
Map.addLayer(punjabStyles.flagged,        {}, 'Punjab | Noise-flagged districts (red)', true);
Map.addLayer(uttarakhandStyles.normal,    {}, 'Uttarakhand | All boundaries',               true);
Map.addLayer(uttarakhandStyles.topChange, {}, 'Uttarakhand | Top change districts (orange)', true);
Map.addLayer(uttarakhandStyles.flagged,   {}, 'Uttarakhand | Noise-flagged districts (red)', true);

// ============================================================
// 11. CLICK INSPECTOR — SEASONAL
//     Prints class name for every season × year combination
//     for whichever pixel you click
// ============================================================
var classNames = {
  1: 'Vegetation',
  2: 'Cropland',
  3: 'Water',
  4: 'Built-up',
  5: 'Barren/Bare'
};

Map.onClick(function(coords) {
  var point = ee.Geometry.Point([coords.lon, coords.lat]);
  print('══════════════════════════════');
  print('Clicked:', coords.lon.toFixed(4), coords.lat.toFixed(4));
  print('══════════════════════════════');

  years.forEach(function(year) {
    print('── ' + year + ' ──────────────────');
    seasons.forEach(function(season) {

      // Punjab
      lulcStore.punjab[year][season.shortName]
        .reduceRegion(ee.Reducer.first(), point, 10)
        .get('label')
        .evaluate(function(v) {
          print('Punjab ' + season.name + ' → ' + (classNames[v] || 'masked'));
        });

      // Uttarakhand
      lulcStore.uttarakhand[year][season.shortName]
        .reduceRegion(ee.Reducer.first(), point, 10)
        .get('label')
        .evaluate(function(v) {
          print('Uttarakhand ' + season.name + ' → ' + (classNames[v] || 'masked'));
        });
    });
  });
});

// ============================================================
// 12. MAP SETUP
// ============================================================
Map.setCenter(76.5, 30.5, 7);
Map.setOptions('HYBRID');

// ============================================================
// 13. LEGEND
// ============================================================
var legend = ui.Panel({
  style: {position: 'bottom-left', padding: '8px 12px'}
});

legend.add(ui.Label('LULC Classes', {fontWeight: 'bold', fontSize: '13px'}));

[
  {color: '#397D49', label: 'Vegetation (Trees, Grass, Shrub, Flooded)'},
  {color: '#E49635', label: 'Cropland'},
  {color: '#419BDF', label: 'Water'},
  {color: '#C4281B', label: 'Built-up'},
  {color: '#A59B8F', label: 'Barren / Bare'}
].forEach(function(item) {
  var row = ui.Panel({layout: ui.Panel.Layout.flow('horizontal')});
  row.add(ui.Label('', {backgroundColor: item.color, padding: '8px', margin: '0 6px 2px 0'}));
  row.add(ui.Label(item.label, {margin: '2px 0', fontSize: '11px'}));
  legend.add(row);
});

legend.add(ui.Label('─────────────────', {fontSize: '10px', color: 'grey'}));
legend.add(ui.Label('District highlights', {fontWeight: 'bold', fontSize: '12px'}));

[
  {color: 'FF0000', label: 'Noise-flagged (Task 9)'},
  {color: 'FF8C00', label: 'Top change (Task 3)'},
  {color: 'FFFF00', label: 'Changed pixels (2016 vs 2025)'}
].forEach(function(item) {
  var row = ui.Panel({layout: ui.Panel.Layout.flow('horizontal')});
  row.add(ui.Label('', {backgroundColor: item.color, padding: '8px', margin: '0 6px 2px 0'}));
  row.add(ui.Label(item.label, {margin: '2px 0', fontSize: '11px'}));
  legend.add(row);
});

legend.add(ui.Label('─────────────────', {fontSize: '10px', color: 'grey'}));
legend.add(ui.Label('Seasons', {fontWeight: 'bold', fontSize: '12px'}));

[
  'Rabi: Jan – Mar',
  'Pre-Monsoon: Apr – Jun',
  'Kharif: Jul – Sep',
  'Post-Monsoon: Oct – Dec'
].forEach(function(label) {
  legend.add(ui.Label(label, {fontSize: '11px', margin: '2px 0'}));
});

Map.add(legend);

// ============================================================
// 14. INSTRUCTIONS PANEL
// ============================================================
var instructions = ui.Panel({
  style: {position: 'top-right', padding: '8px 12px', maxWidth: '300px'}
});

instructions.add(ui.Label('How to use seasonal validation',
  {fontWeight: 'bold', fontSize: '13px'}));

[
  '1. In the Layers panel, compare the same season across 2016 / 2020 / 2025 — e.g. "Punjab | LULC 2016 Kharif" vs "2025 Kharif".',
  '2. Toggle the matching Satellite layer to verify what the ground actually looked like that season.',
  '3. Turn on "Changed pixels [season]" — if a pixel only appears changed in one season but not others, it is likely noise.',
  '4. If a pixel shows change across ALL four seasons, the change is real and persistent.',
  '5. Click any pixel to print its class for every season and year in the Console.',
  '6. Red districts = Task 9 noise flags. Orange = highest change. Prioritise these.'
].forEach(function(text) {
  instructions.add(ui.Label(text, {fontSize: '11px', margin: '4px 0'}));
});

Map.add(instructions);

print('Seasonal validation map ready.');
print('Layers: 4 seasons × 3 years × 2 states × 2 types (LULC + Satellite) = 48 layers');
print('Click any pixel to inspect class across all seasons and years.');