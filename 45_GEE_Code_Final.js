// ============================================================
//  LULC ANALYSIS — TASKS 4 & 5 (FINAL VERSION WITH VIS LAYERS)
// ============================================================
//
// DATASETS:
// - Dynamic World V1 → 2016 baseline
// - ESA WorldCover v100 → 2020
// - ESA WorldCover v200 → 2025
//
// METHODOLOGY:
// Task 4: Extract water pixels → vectorize → classify by area → aggregate
// Task 5: Dissolve major water bodies → multi-ring buffers → LULC stats
// ============================================================

// ================== BOUNDARY ==================

var gaul = ee.FeatureCollection('FAO/GAUL/2015/level1');
var punjab = gaul.filter(ee.Filter.and(
  ee.Filter.eq('ADM0_NAME', 'India'),
  ee.Filter.eq('ADM1_NAME', 'Punjab')
));

var punjabGeom = punjab.geometry();
Map.centerObject(punjabGeom, 8);
var scale = 10;

// ================== LOAD DATA ==================

var dw2016 = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
  .filterDate('2016-01-01', '2016-12-31')
  .filterBounds(punjabGeom)
  .select('label')
  .mode()
  .clip(punjabGeom);

var wc2020 = ee.ImageCollection('ESA/WorldCover/v100')
  .mosaic()
  .clip(punjabGeom);

var wc2025 = ee.ImageCollection('ESA/WorldCover/v200')
  .mosaic()
  .clip(punjabGeom);

// ================== WATER MASKS ==================

var water2016 = dw2016.eq(0).selfMask();
var water2020 = wc2020.eq(80).selfMask();
var water2025 = wc2025.eq(80).selfMask();

// ================== VECTORISE (OPTIMIZED) ==================

function vectoriseWater(img, year) {
  return img.reduceToVectors({
    geometry: punjabGeom,
    scale: scale,
    geometryType: 'polygon',
    maxPixels: 1e10
  })
  .map(function(f) {
    return f.set({
      area_ha: f.geometry().area(1).divide(10000),
      year: year
    });
  })
  .filter(ee.Filter.gt('area_ha', 0.5))
  .limit(5000);
}

var waterVec2016 = vectoriseWater(water2016, '2016');
var waterVec2020 = vectoriseWater(water2020, '2020');
var waterVec2025 = vectoriseWater(water2025, '2025');

// ================== TASK 4: SIZE CLASSIFICATION ==================

function classify(fc) {
  return fc.map(function(f) {
    var a = ee.Number(f.get('area_ha'));
    var cls = ee.String(
      ee.Algorithms.If(a.lt(1),   'C1_<1ha',
      ee.Algorithms.If(a.lt(50),  'C2_1-50ha',
      ee.Algorithms.If(a.lt(100), 'C3_50-100ha',
      ee.Algorithms.If(a.lt(200), 'C4_100-200ha',
      ee.Algorithms.If(a.lt(300), 'C5_200-300ha',
                                     'C6_>300ha')))))
    );
    return f.set('size_class', cls);
  });
}

var c2016 = classify(waterVec2016);
var c2020 = classify(waterVec2020);
var c2025 = classify(waterVec2025);

// --- STATE SUMMARY ---
var classes = ['C1_<1ha','C2_1-50ha','C3_50-100ha',
               'C4_100-200ha','C5_200-300ha','C6_>300ha'];

function summary(fc, year) {
  return ee.FeatureCollection(classes.map(function(c) {
    var sub = fc.filter(ee.Filter.eq('size_class', c));
    return ee.Feature(null, {
      year: year,
      class: c,
      count: sub.size(),
      total_area: sub.aggregate_sum('area_ha')
    });
  }));
}

var summaryAll = summary(c2016,'2016')
  .merge(summary(c2020,'2020'))
  .merge(summary(c2025,'2025'));

print('Task 4 Summary:', summaryAll);

// ================== TASK 5: BUFFER ANALYSIS ==================

var major2020 = c2020.filter(ee.Filter.gte('area_ha', 100));

var geom = major2020
  .map(function(f){ return f.simplify(50); })
  .geometry(ee.ErrorMargin(10))
  .dissolve(ee.ErrorMargin(10));

function rings(g) {
  var b2 = g.buffer(2000);
  var b4 = g.buffer(4000);
  var b8 = g.buffer(8000);
  var b10 = g.buffer(10000);
  return [b2, b4.difference(b2), b8.difference(b4), b10.difference(b8)];
}

var ringList = rings(geom);
var labels = ['0-2km','2-4km','4-8km','8-10km'];

function lulcStats(img, geom, year, ring) {
  var areaImg = ee.Image.pixelArea();
  return ee.FeatureCollection(
    [10,20,30,40,50,60,70,80,90,95,100].map(function(cls) {
      var raw = areaImg.updateMask(img.eq(cls)).reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: geom,
        scale: 50,
        maxPixels: 1e10
      }).get('area');
      var safeArea = ee.Number(ee.Algorithms.If(raw, raw, 0));
      return ee.Feature(null, {
        year: year, ring: ring, class: cls, area: safeArea
      });
    })
  );
}

var stats = ee.FeatureCollection([]);
for (var i = 0; i < 4; i++) {
  stats = stats.merge(lulcStats(wc2020, ringList[i], '2020', labels[i]));
  stats = stats.merge(lulcStats(wc2025, ringList[i], '2025', labels[i]));
}

print('Task 5 Stats:', stats);

// ================== VISUALIZATION LAYERS ==================

// WorldCover palette
var wcVis = {
  min: 10, max: 100,
  palette: ['006400','ffbb22','ffff4c','f096ff','fa0000',
            'b4b4b4','f0f0f0','0064c8','0096a0','00cf75','fae6a0']
};

// Water body layers
Map.addLayer(water2016, {palette: ['#0000FF']}, 'Water 2016 (DW)', false);
Map.addLayer(water2020, {palette: ['#1E90FF']}, 'Water 2020 (WC)', false);
Map.addLayer(water2025, {palette: ['#00CED1']}, 'Water 2025 (WC)', false);

// LULC layers
Map.addLayer(wc2020, wcVis, 'WorldCover 2020', false);
Map.addLayer(wc2025, wcVis, 'WorldCover 2025', false);

// Major water bodies
Map.addLayer(major2020, {color: 'yellow'}, 'Major Water Bodies (≥100ha)', true);

// Buffer rings with distinct colors
var ringColors = ['#FF4444', '#FF8800', '#FFCC00', '#44FF44'];
for (var j = 0; j < 4; j++) {
  Map.addLayer(ee.FeatureCollection([ee.Feature(ringList[j])]),
    {color: ringColors[j]}, 'Ring: ' + labels[j], false);
}

// Punjab boundary
Map.addLayer(punjab.style({color: 'white', fillColor: '00000000', width: 2}),
  {}, 'Punjab Boundary', true);

// ================== EXTRA ANALYSIS: WATER CHANGE MAP ==================

// Water gain/loss between 2020 and 2025
var waterGain = water2025.unmask(0).subtract(water2020.unmask(0));
var gainMask = waterGain.eq(1).selfMask();   // gained water
var lossMask = waterGain.eq(-1).selfMask();  // lost water

Map.addLayer(gainMask, {palette: ['#00FF00']}, 'Water Gained (2020→2025)', false);
Map.addLayer(lossMask, {palette: ['#FF0000']}, 'Water Lost (2020→2025)', false);

// ================== EXPORT ==================

Export.table.toDrive({
  collection: summaryAll,
  description: 'Task4_SizeClass'
});

Export.table.toDrive({
  collection: stats,
  description: 'Task5_LULC_Buffers'
});

print('✅ All layers loaded. Toggle layers in the Layers panel.');
print('✅ Run export tasks from the Tasks tab.');
