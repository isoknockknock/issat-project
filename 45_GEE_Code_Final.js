// ============================================================
//  LULC ANALYSIS — TASKS 4 & 5 (FINAL VERSION WITH VIS LAYERS)
//  STATES: PUNJAB & UTTARAKHAND, INDIA
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

// ================== BOUNDARIES ==================

var gaul = ee.FeatureCollection('FAO/GAUL/2015/level1');

var punjab = gaul.filter(ee.Filter.and(
  ee.Filter.eq('ADM0_NAME', 'India'),
  ee.Filter.eq('ADM1_NAME', 'Punjab')
));

var uttarakhand = gaul.filter(ee.Filter.and(
  ee.Filter.eq('ADM0_NAME', 'India'),
  ee.Filter.eq('ADM1_NAME', 'Uttarakhand')
));

var punjabGeom = punjab.geometry();
var uttarakhandGeom = uttarakhand.geometry();

// Combined geometry for map centering
var combinedGeom = punjabGeom.union(uttarakhandGeom);
Map.centerObject(combinedGeom, 7);
var scale = 10;

// ================== LOAD DATA — PUNJAB ==================

var dw2016_pb = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
  .filterDate('2016-01-01', '2016-12-31')
  .filterBounds(punjabGeom)
  .select('label')
  .mode()
  .clip(punjabGeom);

var wc2020_pb = ee.ImageCollection('ESA/WorldCover/v100')
  .mosaic()
  .clip(punjabGeom);

var wc2025_pb = ee.ImageCollection('ESA/WorldCover/v200')
  .mosaic()
  .clip(punjabGeom);

// ================== LOAD DATA — UTTARAKHAND ==================

var dw2016_uk = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
  .filterDate('2016-01-01', '2016-12-31')
  .filterBounds(uttarakhandGeom)
  .select('label')
  .mode()
  .clip(uttarakhandGeom);

var wc2020_uk = ee.ImageCollection('ESA/WorldCover/v100')
  .mosaic()
  .clip(uttarakhandGeom);

var wc2025_uk = ee.ImageCollection('ESA/WorldCover/v200')
  .mosaic()
  .clip(uttarakhandGeom);

// ================== WATER MASKS — PUNJAB ==================

var water2016_pb = dw2016_pb.eq(0).selfMask();
var water2020_pb = wc2020_pb.eq(80).selfMask();
var water2025_pb = wc2025_pb.eq(80).selfMask();

// ================== WATER MASKS — UTTARAKHAND ==================

var water2016_uk = dw2016_uk.eq(0).selfMask();
var water2020_uk = wc2020_uk.eq(80).selfMask();
var water2025_uk = wc2025_uk.eq(80).selfMask();

// ================== VECTORISE (OPTIMIZED) ==================

function vectoriseWater(img, geom, year, stateName) {
  return img.reduceToVectors({
    geometry: geom,
    scale: scale,
    geometryType: 'polygon',
    maxPixels: 1e10
  })
  .map(function(f) {
    return f.set({
      area_ha: f.geometry().area(1).divide(10000),
      year: year,
      state: stateName
    });
  })
  .filter(ee.Filter.gt('area_ha', 0.5))
  .limit(5000);
}

// Punjab
var waterVec2016_pb = vectoriseWater(water2016_pb, punjabGeom, '2016', 'Punjab');
var waterVec2020_pb = vectoriseWater(water2020_pb, punjabGeom, '2020', 'Punjab');
var waterVec2025_pb = vectoriseWater(water2025_pb, punjabGeom, '2025', 'Punjab');

// Uttarakhand
var waterVec2016_uk = vectoriseWater(water2016_uk, uttarakhandGeom, '2016', 'Uttarakhand');
var waterVec2020_uk = vectoriseWater(water2020_uk, uttarakhandGeom, '2020', 'Uttarakhand');
var waterVec2025_uk = vectoriseWater(water2025_uk, uttarakhandGeom, '2025', 'Uttarakhand');

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

// Punjab
var c2016_pb = classify(waterVec2016_pb);
var c2020_pb = classify(waterVec2020_pb);
var c2025_pb = classify(waterVec2025_pb);

// Uttarakhand
var c2016_uk = classify(waterVec2016_uk);
var c2020_uk = classify(waterVec2020_uk);
var c2025_uk = classify(waterVec2025_uk);

// --- STATE SUMMARIES ---
var classes = ['C1_<1ha','C2_1-50ha','C3_50-100ha',
               'C4_100-200ha','C5_200-300ha','C6_>300ha'];

function summary(fc, year, stateName) {
  return ee.FeatureCollection(classes.map(function(c) {
    var sub = fc.filter(ee.Filter.eq('size_class', c));
    return ee.Feature(null, {
      state: stateName,
      year: year,
      class: c,
      count: sub.size(),
      total_area: sub.aggregate_sum('area_ha')
    });
  }));
}

// Punjab summary
var summaryPb = summary(c2016_pb,'2016','Punjab')
  .merge(summary(c2020_pb,'2020','Punjab'))
  .merge(summary(c2025_pb,'2025','Punjab'));

// Uttarakhand summary
var summaryUk = summary(c2016_uk,'2016','Uttarakhand')
  .merge(summary(c2020_uk,'2020','Uttarakhand'))
  .merge(summary(c2025_uk,'2025','Uttarakhand'));

var summaryAll = summaryPb.merge(summaryUk);

print('Task 4 Summary (Both States):', summaryAll);

// ================== TASK 5: BUFFER ANALYSIS ==================

function bufferAnalysis(classified2020, wc2020, wc2025, geomName) {
  var major2020 = classified2020.filter(ee.Filter.gte('area_ha', 100));

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

  function lulcStats(img, ringGeom, year, ring) {
    var areaImg = ee.Image.pixelArea();
    return ee.FeatureCollection(
      [10,20,30,40,50,60,70,80,90,95,100].map(function(cls) {
        var raw = areaImg.updateMask(img.eq(cls)).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: ringGeom,
          scale: 50,
          maxPixels: 1e10
        }).get('area');
        var safeArea = ee.Number(ee.Algorithms.If(raw, raw, 0));
        return ee.Feature(null, {
          state: geomName, year: year, ring: ring, class: cls, area: safeArea
        });
      })
    );
  }

  var stats = ee.FeatureCollection([]);
  for (var i = 0; i < 4; i++) {
    stats = stats.merge(lulcStats(wc2020, ringList[i], '2020', labels[i]));
    stats = stats.merge(lulcStats(wc2025, ringList[i], '2025', labels[i]));
  }

  return {stats: stats, ringList: ringList, labels: labels, major: major2020};
}

// Punjab buffer analysis
var pbBuffer = bufferAnalysis(c2020_pb, wc2020_pb, wc2025_pb, 'Punjab');
// Uttarakhand buffer analysis
var ukBuffer = bufferAnalysis(c2020_uk, wc2020_uk, wc2025_uk, 'Uttarakhand');

var statsAll = pbBuffer.stats.merge(ukBuffer.stats);
print('Task 5 Stats (Both States):', statsAll);

// ================== VISUALIZATION LAYERS ==================

// WorldCover palette
var wcVis = {
  min: 10, max: 100,
  palette: ['006400','ffbb22','ffff4c','f096ff','fa0000',
            'b4b4b4','f0f0f0','0064c8','0096a0','00cf75','fae6a0']
};

// --- PUNJAB LAYERS ---
Map.addLayer(water2016_pb, {palette: ['#0000FF']}, 'PB: Water 2016 (DW)', false);
Map.addLayer(water2020_pb, {palette: ['#1E90FF']}, 'PB: Water 2020 (WC)', false);
Map.addLayer(water2025_pb, {palette: ['#00CED1']}, 'PB: Water 2025 (WC)', false);
Map.addLayer(wc2020_pb, wcVis, 'PB: WorldCover 2020', false);
Map.addLayer(wc2025_pb, wcVis, 'PB: WorldCover 2025', false);
Map.addLayer(pbBuffer.major, {color: 'yellow'}, 'PB: Major Water Bodies (≥100ha)', true);

// Punjab buffer rings
var ringColors = ['#FF4444', '#FF8800', '#FFCC00', '#44FF44'];
for (var j = 0; j < 4; j++) {
  Map.addLayer(ee.FeatureCollection([ee.Feature(pbBuffer.ringList[j])]),
    {color: ringColors[j]}, 'PB Ring: ' + pbBuffer.labels[j], false);
}

// --- UTTARAKHAND LAYERS ---
Map.addLayer(water2016_uk, {palette: ['#0000FF']}, 'UK: Water 2016 (DW)', false);
Map.addLayer(water2020_uk, {palette: ['#1E90FF']}, 'UK: Water 2020 (WC)', false);
Map.addLayer(water2025_uk, {palette: ['#00CED1']}, 'UK: Water 2025 (WC)', false);
Map.addLayer(wc2020_uk, wcVis, 'UK: WorldCover 2020', false);
Map.addLayer(wc2025_uk, wcVis, 'UK: WorldCover 2025', false);
Map.addLayer(ukBuffer.major, {color: 'cyan'}, 'UK: Major Water Bodies (≥100ha)', true);

// Uttarakhand buffer rings
for (var k = 0; k < 4; k++) {
  Map.addLayer(ee.FeatureCollection([ee.Feature(ukBuffer.ringList[k])]),
    {color: ringColors[k]}, 'UK Ring: ' + ukBuffer.labels[k], false);
}

// --- BOUNDARIES ---
Map.addLayer(punjab.style({color: 'white', fillColor: '00000000', width: 2}),
  {}, 'Punjab Boundary', true);
Map.addLayer(uttarakhand.style({color: '#FFD700', fillColor: '00000000', width: 2}),
  {}, 'Uttarakhand Boundary', true);

// ================== EXTRA ANALYSIS: WATER CHANGE MAP ==================

// Punjab water gain/loss 2020→2025
var waterGain_pb = water2025_pb.unmask(0).subtract(water2020_pb.unmask(0));
Map.addLayer(waterGain_pb.eq(1).selfMask(), {palette: ['#00FF00']}, 'PB: Water Gained (2020→2025)', false);
Map.addLayer(waterGain_pb.eq(-1).selfMask(), {palette: ['#FF0000']}, 'PB: Water Lost (2020→2025)', false);

// Uttarakhand water gain/loss 2020→2025
var waterGain_uk = water2025_uk.unmask(0).subtract(water2020_uk.unmask(0));
Map.addLayer(waterGain_uk.eq(1).selfMask(), {palette: ['#00FF00']}, 'UK: Water Gained (2020→2025)', false);
Map.addLayer(waterGain_uk.eq(-1).selfMask(), {palette: ['#FF0000']}, 'UK: Water Lost (2020→2025)', false);

// ================== EXPORT ==================

Export.table.toDrive({
  collection: summaryAll,
  description: 'Task4_SizeClass_BothStates'
});

Export.table.toDrive({
  collection: statsAll,
  description: 'Task5_LULC_Buffers_BothStates'
});

print('✅ All layers loaded for Punjab & Uttarakhand. Toggle in Layers panel.');
print('✅ Run export tasks from the Tasks tab.');
