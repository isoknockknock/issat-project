// ============================================================
//  LULC ANALYSIS — TASKS 4 & 5 (COMPLETE FINAL CODE)
//  STATES: PUNJAB & UTTARAKHAND, INDIA
//  YEARS: 2016, 2020, 2025
// ============================================================
//
// THIS SINGLE SCRIPT DOES EVERYTHING:
//   1. Loads boundaries for both states
//   2. Loads LULC data (Dynamic World 2016, WorldCover 2020/2025)
//   3. Task 4: Water body extraction, vectorization, size classification
//   4. Task 5: Major water body buffers, LULC stats per ring
//   5. Visualization layers for screenshots (maps, water, buffers, change)
//   6. Exports to Drive (Task4 CSV, Task5 CSV)
//
// HOW TO USE:
//   - Paste into GEE Code Editor
//   - Click RUN
//   - Take screenshots from the map layers panel
//   - Go to Tasks tab → click RUN on each export task
// ============================================================


// ==================== 1. BOUNDARIES ====================

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

Map.centerObject(punjabGeom.union(uttarakhandGeom), 7);
var scale = 10;


// ==================== 2. LOAD LULC DATA ====================

// --- Helper: load appropriate dataset for a year & region ---
function loadLULC(year, geom) {
  if (year === '2016') {
    return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
      .filterDate('2016-01-01', '2016-12-31')
      .filterBounds(geom)
      .select('label')
      .mode()
      .clip(geom);
  } else if (year === '2020') {
    return ee.ImageCollection('ESA/WorldCover/v100').mosaic().clip(geom);
  } else {
    return ee.ImageCollection('ESA/WorldCover/v200').mosaic().clip(geom);
  }
}

// --- Helper: load LULC with DW→WC remapping (for Task 5 consistency) ---
function loadLULC_remapped(year, geom) {
  if (year === '2016') {
    var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
      .filterDate('2016-01-01', '2016-12-31')
      .filterBounds(geom).select('label').mode().clip(geom);
    // Remap DW classes to WC-like codes: 0(water)→80, 4(crops)→40, 6(built)→50, rest→0
    return dw.remap([0, 4, 6], [80, 40, 50], 0).rename('label');
  } else if (year === '2020') {
    return ee.ImageCollection('ESA/WorldCover/v100').mosaic().clip(geom).rename('label');
  } else {
    return ee.ImageCollection('ESA/WorldCover/v200').mosaic().clip(geom).rename('label');
  }
}

// Punjab LULC (native classes for Task 4 water extraction)
var dw2016_pb = loadLULC('2016', punjabGeom);
var wc2020_pb = loadLULC('2020', punjabGeom);
var wc2025_pb = loadLULC('2025', punjabGeom);

// Uttarakhand LULC
var dw2016_uk = loadLULC('2016', uttarakhandGeom);
var wc2020_uk = loadLULC('2020', uttarakhandGeom);
var wc2025_uk = loadLULC('2025', uttarakhandGeom);


// ==================== 3. WATER MASKS ====================

// DW class 0 = water; WC class 80 = permanent water
var water2016_pb = dw2016_pb.eq(0).selfMask();
var water2020_pb = wc2020_pb.eq(80).selfMask();
var water2025_pb = wc2025_pb.eq(80).selfMask();

var water2016_uk = dw2016_uk.eq(0).selfMask();
var water2020_uk = wc2020_uk.eq(80).selfMask();
var water2025_uk = wc2025_uk.eq(80).selfMask();


// ==================== 4. TASK 4: SIZE CLASSIFICATION ====================

function vectoriseWater(img, geom, year, stateName) {
  return img.reduceToVectors({
    geometry: geom, scale: scale,
    geometryType: 'polygon', maxPixels: 1e10
  })
  .map(function(f) {
    return f.set({
      area_ha: f.geometry().area(1).divide(10000),
      year: year, state: stateName
    });
  })
  .filter(ee.Filter.gt('area_ha', 0.5))
  .limit(5000);
}

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

var classes = ['C1_<1ha','C2_1-50ha','C3_50-100ha',
               'C4_100-200ha','C5_200-300ha','C6_>300ha'];

function summary(fc, year, stateName) {
  return ee.FeatureCollection(classes.map(function(c) {
    var sub = fc.filter(ee.Filter.eq('size_class', c));
    return ee.Feature(null, {
      state: stateName, year: year,
      class: c, count: sub.size(),
      total_area: sub.aggregate_sum('area_ha')
    });
  }));
}

// --- Punjab Task 4 ---
var c2016_pb = classify(vectoriseWater(water2016_pb, punjabGeom, '2016', 'Punjab'));
var c2020_pb = classify(vectoriseWater(water2020_pb, punjabGeom, '2020', 'Punjab'));
var c2025_pb = classify(vectoriseWater(water2025_pb, punjabGeom, '2025', 'Punjab'));

var summaryPb = summary(c2016_pb,'2016','Punjab')
  .merge(summary(c2020_pb,'2020','Punjab'))
  .merge(summary(c2025_pb,'2025','Punjab'));

// --- Uttarakhand Task 4 ---
var c2016_uk = classify(vectoriseWater(water2016_uk, uttarakhandGeom, '2016', 'Uttarakhand'));
var c2020_uk = classify(vectoriseWater(water2020_uk, uttarakhandGeom, '2020', 'Uttarakhand'));
var c2025_uk = classify(vectoriseWater(water2025_uk, uttarakhandGeom, '2025', 'Uttarakhand'));

var summaryUk = summary(c2016_uk,'2016','Uttarakhand')
  .merge(summary(c2020_uk,'2020','Uttarakhand'))
  .merge(summary(c2025_uk,'2025','Uttarakhand'));

var task4All = summaryPb.merge(summaryUk);
print('Task 4 Summary (Both States):', task4All);


// ==================== 5. TASK 5: BUFFER ANALYSIS ====================

function bufferAnalysis(classified2020, wc2020, wc2025, stateName) {
  var major2020 = classified2020.filter(ee.Filter.gte('area_ha', 100));

  var dissolved = major2020
    .map(function(f){ return f.simplify(50); })
    .geometry(ee.ErrorMargin(10))
    .dissolve(ee.ErrorMargin(10));

  var b2 = dissolved.buffer(2000);
  var b4 = dissolved.buffer(4000);
  var b8 = dissolved.buffer(8000);
  var b10 = dissolved.buffer(10000);
  var ringList = [b2, b4.difference(b2), b8.difference(b4), b10.difference(b8)];
  var labels = ['0-2km','2-4km','4-8km','8-10km'];

  // --- Remapped LULC for consistent class codes in Task 5 ---
  function lulcStats(img, ringGeom, year, ring) {
    var areaImg = ee.Image.pixelArea();
    return ee.FeatureCollection(
      [10,20,30,40,50,60,70,80,90,95,100].map(function(cls) {
        var raw = areaImg.updateMask(img.eq(cls)).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: ringGeom, scale: 50, maxPixels: 1e10
        }).get('area');
        var safeArea = ee.Number(ee.Algorithms.If(raw, raw, 0));
        return ee.Feature(null, {
          state: stateName, year: year, ring: ring, class: cls, area: safeArea
        });
      })
    );
  }

  var stats = ee.FeatureCollection([]);
  for (var i = 0; i < 4; i++) {
    stats = stats.merge(lulcStats(wc2020, ringList[i], '2020', labels[i]));
    stats = stats.merge(lulcStats(wc2025, ringList[i], '2025', labels[i]));
  }

  // --- Also get remapped 2016 stats ---
  var lulc2016_remapped = loadLULC_remapped('2016',
    stateName === 'Punjab' ? punjabGeom : uttarakhandGeom);
  var stats2016 = ee.FeatureCollection([]);
  for (var j = 0; j < 4; j++) {
    stats2016 = stats2016.merge(
      (function(img, ringGeom, year, ring) {
        var areaImg = ee.Image.pixelArea();
        return ee.FeatureCollection(
          [0, 10,20,30,40,50,60,70,80,90,95,100].map(function(cls) {
            var raw = areaImg.updateMask(img.eq(cls)).reduceRegion({
              reducer: ee.Reducer.sum(),
              geometry: ringGeom, scale: 50, maxPixels: 1e10
            }).get('area');
            var safeArea = ee.Number(ee.Algorithms.If(raw, raw, 0));
            return ee.Feature(null, {
              state: stateName, year: year, ring: ring, class: cls, area: safeArea
            });
          })
        );
      })(lulc2016_remapped, ringList[j], '2016', labels[j])
    );
  }
  stats = stats.merge(stats2016);

  return {stats: stats, ringList: ringList, labels: labels, major: major2020, dissolved: dissolved};
}

var pbBuf = bufferAnalysis(c2020_pb, wc2020_pb, wc2025_pb, 'Punjab');
var ukBuf = bufferAnalysis(c2020_uk, wc2020_uk, wc2025_uk, 'Uttarakhand');

var task5All = pbBuf.stats.merge(ukBuf.stats);
print('Task 5 Stats (Both States):', task5All);


// ==================== 6. VISUALIZATION LAYERS ====================
// Toggle these in the Layers panel to take screenshots for slides

var wcVis = {
  min: 10, max: 100,
  palette: ['006400','ffbb22','ffff4c','f096ff','fa0000',
            'b4b4b4','f0f0f0','0064c8','0096a0','00cf75','fae6a0']
};

// --- Boundaries ---
Map.addLayer(punjab.style({color: 'white', fillColor: '00000000', width: 2}),
  {}, 'Punjab Boundary', true);
Map.addLayer(uttarakhand.style({color: '#FFD700', fillColor: '00000000', width: 2}),
  {}, 'Uttarakhand Boundary', true);

// --- Punjab water layers ---
Map.addLayer(water2016_pb, {palette: ['#0000FF']}, 'PB: Water 2016 (DW)', false);
Map.addLayer(water2020_pb, {palette: ['#1E90FF']}, 'PB: Water 2020 (WC)', false);
Map.addLayer(water2025_pb, {palette: ['#00CED1']}, 'PB: Water 2025 (WC)', false);

// --- Uttarakhand water layers ---
Map.addLayer(water2016_uk, {palette: ['#0000FF']}, 'UK: Water 2016 (DW)', false);
Map.addLayer(water2020_uk, {palette: ['#1E90FF']}, 'UK: Water 2020 (WC)', false);
Map.addLayer(water2025_uk, {palette: ['#00CED1']}, 'UK: Water 2025 (WC)', false);

// --- WorldCover LULC ---
Map.addLayer(wc2020_pb, wcVis, 'PB: WorldCover 2020', false);
Map.addLayer(wc2025_pb, wcVis, 'PB: WorldCover 2025', false);
Map.addLayer(wc2020_uk, wcVis, 'UK: WorldCover 2020', false);
Map.addLayer(wc2025_uk, wcVis, 'UK: WorldCover 2025', false);

// --- Major water bodies ---
Map.addLayer(pbBuf.major, {color: 'yellow'}, 'PB: Major Water Bodies (≥100ha)', true);
Map.addLayer(ukBuf.major, {color: 'cyan'}, 'UK: Major Water Bodies (≥100ha)', true);

// --- Buffer rings ---
var ringColors = ['#FF4444', '#FF8800', '#FFCC00', '#44FF44'];
var labels = ['0-2km','2-4km','4-8km','8-10km'];
for (var r = 0; r < 4; r++) {
  Map.addLayer(ee.FeatureCollection([ee.Feature(pbBuf.ringList[r])]),
    {color: ringColors[r]}, 'PB Ring: ' + labels[r], false);
  Map.addLayer(ee.FeatureCollection([ee.Feature(ukBuf.ringList[r])]),
    {color: ringColors[r]}, 'UK Ring: ' + labels[r], false);
}

// --- Water change maps (2020→2025) ---
var gain_pb = water2025_pb.unmask(0).subtract(water2020_pb.unmask(0));
Map.addLayer(gain_pb.eq(1).selfMask(), {palette: ['#00FF00']}, 'PB: Water Gained 2020→2025', false);
Map.addLayer(gain_pb.eq(-1).selfMask(), {palette: ['#FF0000']}, 'PB: Water Lost 2020→2025', false);

var gain_uk = water2025_uk.unmask(0).subtract(water2020_uk.unmask(0));
Map.addLayer(gain_uk.eq(1).selfMask(), {palette: ['#00FF00']}, 'UK: Water Gained 2020→2025', false);
Map.addLayer(gain_uk.eq(-1).selfMask(), {palette: ['#FF0000']}, 'UK: Water Lost 2020→2025', false);


// ==================== 7. EXPORTS ====================

Export.table.toDrive({
  collection: task4All,
  description: 'Task4_SizeClass_BothStates',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: task5All,
  description: 'Task5_LULC_Buffers_BothStates',
  fileFormat: 'CSV'
});


// ==================== 8. SCREENSHOTS GUIDE ====================
// Take these screenshots from the map for your slides:
//
// SLIDE 3 (Study Area):
//   → Turn on: Punjab Boundary + Uttarakhand Boundary + base map
//   → Zoom to show both states
//
// SLIDE 7 (Water Bodies):
//   → Turn on: PB: Water 2020 (WC) + Punjab Boundary
//   → Then: UK: Water 2020 (WC) + Uttarakhand Boundary
//
// SLIDE 8 (Major Water Bodies):
//   → Turn on: PB: Major Water Bodies + UK: Major Water Bodies
//
// SLIDE 10 (Buffer Rings):
//   → Turn on: PB Ring: 0-2km + 2-4km + 4-8km + 8-10km + Major WBs
//   → Same for UK
//
// SLIDE 12 (Water Change):
//   → Turn on: PB: Water Lost + Water Gained
//   → Same for UK
//
// ============================================================

print('✅ All layers loaded for Punjab & Uttarakhand.');
print('✅ Toggle layers in the Layers panel and take screenshots.');
print('✅ Go to Tasks tab → click RUN to export CSVs.');
