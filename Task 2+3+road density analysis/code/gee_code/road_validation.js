/***********************************************************************
 * UPDATED GEE VISUAL VALIDATION (INDIA ONLY)
 * Features: LULC (16, 20, 25), Sentinel-2, Road Asset Validation
 ***********************************************************************/

// 1. BOUNDARIES & ASSETS
var districts = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level2');

// ADDED ADM0_NAME filter to exclude Pakistan's Punjab
var punjab = districts
  .filter(ee.Filter.eq('ADM0_NAME', 'India'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Punjab'));

var uttarakhand = districts
  .filter(ee.Filter.eq('ADM0_NAME', 'India'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Uttarakhand'));

// Road Assets for Validation
var northRoads   = ee.FeatureCollection('projects/spatial-491104/assets/project'); 
var centralRoads = ee.FeatureCollection('projects/spatial-491104/assets/central'); 

// 2. LULC GENERATION
var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1');

function getLULC(year, region) {
  var start = ee.Date.fromYMD(year, 1, 1);
  var end   = ee.Date.fromYMD(year, 12, 31);
  var label = dw.filterDate(start, end).filterBounds(region)
    .select('label').reduce(ee.Reducer.mode());
  return label.remap(
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
    [0, 10, 30, 80, 40, 20, 50, 60, 70]
  ).rename('label').clip(region);
}

var p2016 = getLULC(2016, punjab);
var p2020 = getLULC(2020, punjab);
var p2025 = getLULC(2025, punjab);

var u2016 = getLULC(2016, uttarakhand);
var u2020 = getLULC(2020, uttarakhand);
var u2025 = getLULC(2025, uttarakhand);

var lulcVis = {
  min: 0, max: 80,
  palette: ['#419BDF','#397D49','#88B053','#7A87C6','#E49635','#C4281B','#A59B8F','#B39FE1','#7AAFB0']
};

// 3. ADD LAYERS TO MAP
Map.setCenter(76.5, 30.5, 7); // Adjusted center for Indian Punjab/UK
Map.setOptions('HYBRID');

// --- SENTINEL-2 REFERENCE ---
function getS2(year, region) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(ee.Date.fromYMD(year, 1, 1), ee.Date.fromYMD(year, 12, 31))
    .filterBounds(region).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
    .median().clip(region);
}
Map.addLayer(getS2(2025, punjab.merge(uttarakhand)), {bands:['B4','B3','B2'], min:0, max:3000}, 'Satellite 2025', false);


// --- LULC LAYERS ---
Map.addLayer(p2016, lulcVis, 'Punjab (India) | LULC 2016', false);
Map.addLayer(p2020, lulcVis, 'Punjab (India) | LULC 2020', false);
Map.addLayer(p2025, lulcVis, 'Punjab (India) | LULC 2025', true);

Map.addLayer(u2016, lulcVis, 'UK | LULC 2016', false);
Map.addLayer(u2020, lulcVis, 'UK | LULC 2020', false);
Map.addLayer(u2025, lulcVis, 'UK | LULC 2025', true);

// --- ROAD INFRASTRUCTURE VALIDATION ---
// Clips the road network to the India-specific boundaries
Map.addLayer(northRoads.filterBounds(punjab).draw({color: '00FFFF', strokeWidth: 1}), {}, 'Punjab Road Network (Cyan)', true);
Map.addLayer(centralRoads.filterBounds(uttarakhand).draw({color: 'FF00FF', strokeWidth: 1}), {}, 'UK Road Network (Magenta)', true);


print('Validation layers for India (Punjab & UK) loaded.');