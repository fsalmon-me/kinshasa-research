export default {
  // ── Common / shared ──
  common: {
    back: 'Back',
    map: 'Map',
    reports: 'Reports',
    admin: 'Admin',
    about: 'About',
    save: 'Save',
    saving: 'Saving…',
    delete: 'Delete',
    cancel: 'Cancel',
    apply: 'Apply',
    add: 'Add',
    export: 'Export',
    import: 'Import',
    close: 'Close',
    loading: 'Loading…',
    error: 'Error',
    copy: 'Copy',
    search: 'Search',
    noData: 'No data available.',
    confirm: 'Confirm',
  },

  // ── Categories ──
  categories: {
    statistics: 'Statistics',
    infrastructure: 'Infrastructure',
    poi: 'Points of interest',
    transport: 'Transport',
    other: 'Other',
    statisticsIcon: '📊 Statistics',
    infrastructureIcon: '🛣️ Infrastructure',
    poiIcon: '📍 Points of interest',
    transportIcon: '🚗 Transport',
    otherIcon: '📦 Other',
  },

  // ── Login page ──
  login: {
    title: 'Admin Login',
    subtitle: 'Kinshasa Research — Restricted Access',
    email: 'Email',
    password: 'Password',
    submit: 'Log in',
    connecting: 'Connecting…',
    backToMap: 'Back to map',
  },

  // ── Layer panel ──
  layers: {
    title: 'Layers',
    source: 'Source:',
    license: 'License:',
    date: 'Date:',
    methodology: 'Methodology:',
    limitations: 'Limitations:',
    viewSource: 'View source →',
  },

  // ── Sources panel ──
  sources: {
    toggle: 'Sources',
    title: 'Sources & Methodology',
    methodology: 'Methodology:',
    notes: 'Notes:',
  },

  // ── Congestion bar ──
  congestion: {
    label: '🕐 Travel time:',
  },

  // ── Commune sidebar ──
  commune: {
    population: '👥 Population',
    activeData: '📊 Active data',
    poi: '📍 Points of interest',
  },

  // ── Search bar ──
  searchBar: {
    placeholder: 'Search commune or place… (Ctrl+K)',
  },

  // ── Reports page ──
  reportsPage: {
    newReport: 'New report',
    noReports: 'No reports available',
    emptyText: "Reports allow you to analyse the geographic data of Kinshasa.",
    createReport: 'Create a report',
    allReports: 'All reports',
  },

  // ── Report editor page ──
  editor: {
    newReport: 'New report',
    save: '💾 Save',
    saving: 'Saving…',
    savedOk: '✓ Report saved',
    errorPrefix: '✗ Error:',
    delete: 'Delete',
    confirmDelete: 'Delete "{title}"?',
    generate: '🔄 Generate',
    generating: 'Generating…',
    fuelReport: 'Fuel Supply & Demand',
    generatedOk: '✓ Report generated ({count} blocks) — Click 💾 to save to Firestore',
    errorGenerate: '✗ Generation error:',
    unknownGenerator: 'Unknown generator: {type}',
    jsonCopied: '📋 JSON copied to clipboard',
    blocksUpdated: '✓ Blocks updated from JSON',
    invalidJson: '✗ Invalid JSON:',
    jsonEdit: 'JSON block editor',
    copyJson: 'Copy JSON',
    copy: 'Copy',
    debugGenerated: 'Generated report ({count} blocks)',
    metaTitle: 'Title',
    metaTitlePlaceholder: 'Report title',
    metaSlug: 'Slug',
    metaSlugPlaceholder: 'auto-generated',
    metaDescription: 'Description',
    metaDescPlaceholder: 'Short description',
    addLabel: 'Add',
    blockTitle: 'Title',
    blockText: 'Text',
    blockTable: 'Table',
    blockChart: 'Chart',
    blockSources: 'Sources',
  },

  // ── Block editor ──
  blockEditor: {
    moveUp: 'Move up',
    moveDown: 'Move down',
    delete: 'Delete',
  },

  // ── Report table block ──
  tableBlock: {
    error: 'Error: {message}',
    empty: 'No data available.',
  },

  // ── Report sources block ──
  sourcesBlock: {
    dataUsed: 'Data used',
    externalRefs: 'External references',
    noSources: 'No sources listed.',
    addSource: '+ Add a source',
    labelPlaceholder: 'Source label *',
    urlPlaceholder: 'URL (optional)',
    datePlaceholder: 'Date (optional)',
    descriptionPlaceholder: 'Description (optional)',
    delete: 'Delete',
  },

  // ── Admin page ──
  adminPage: {
    title: 'Data Administration',
    export: 'Export',
    import: 'Import',
    exportTooltip: 'Export annotations (JSON)',
    importTooltip: 'Import annotations from a JSON file',
    logout: 'Log out',
    searchPlaceholder: 'Search in data…',
    loadError: 'Loading error:',
    importError: 'Import error:',
    modSaved: 'Change saved in memory',
    verifiedUpdated: 'Verified status updated',
    exported: 'File metadata-overrides.json exported',
    importSuccess: 'Overrides imported successfully',
    crystallised: 'downloaded — place it in public/data/ and commit',
    entries: 'Entries',
    named: 'Named',
    verified: 'Verified',
    crystallise: 'Crystallise',
    crystalliseTooltip: 'Download enriched JSON for commit into public/data/',
    exportEnriched: 'Export enriched',
    draftTooltip: 'Draft layer — not visible on the map',
    todoTitle: 'To enrich',
    todoPlaceholder: 'New task…',
    noTodos: 'No tasks',
    durations: 'Durations',
    distances: 'Distances',
    speed: 'Speed',
    fast: 'Fast',
    slow: 'Slow',
    short: 'Short',
    long: 'Long',
    verifiedLabel: 'Verified',
    notVerified: 'Not verified',
    noResults: 'No results for this search.',
    noData: 'No data.',
    selectLayer: 'Select a layer from the menu on the left.',
  },

  // ── About page ──
  aboutPage: {
    title: 'About — Sources & Methodology',
    objectiveTitle: 'Objective',
    objectiveText:
      'This interactive map presents geospatial data about the city of Kinshasa, Democratic Republic of the Congo. It is designed to support academic research by rigorously documenting all data sources and methodological decisions.',
    architectureTitle: 'Technical Architecture',
    mapping: 'Mapping',
    osmTiles: 'OpenStreetMap tiles',
    geoData: 'Geographic data',
    statData: 'Statistical data',
    travelTime: 'travel time',
    hosting: 'Hosting',
    static: 'static, no server',
    methodologyTitle: 'Methodology',
    communeBoundariesTitle: 'Commune Boundaries',
    communeBoundariesText:
      "The 24 communes of Kinshasa are extracted from OpenStreetMap via the Overpass API (admin_level=7, corresponding to communes in the DRC's administrative hierarchy). OSM relations are converted to GeoJSON polygons. Level 8 (quartiers) is not used because available statistical data granularity stops at the commune level.",
    roadNetworkTitle: 'Road Network',
    roadNetworkText1: 'The road network is split into two layers for performance:',
    mainRoads: 'Main roads',
    minorRoads: 'Minor roads',
    roadNetworkText2:
      'Coordinates are rounded to 5 decimal places (~1.1m precision) to reduce file size. OSM coverage of residential roads is uneven — more complete in central communes than peripheral ones.',
    poiTitle: 'Points of Interest',
    poiText:
      'All POIs come from OpenStreetMap (ODbL license). Overpass queries target specific tags (amenity=hospital, amenity=school, etc.). Coverage varies: good for schools (HOT/Missing Maps campaigns), moderate for health and fuel stations, low for informal markets.',
    travelTimeTitle: 'Travel Time',
    travelTimeText1:
      'Inter-communal travel times are calculated via OSRM (Open Source Routing Machine) using OSM road data. For each commune, the reference point is the geographic centroid snapped to the nearest road (via OSRM /nearest), avoiding placement in inaccessible areas (forest, river). The 24×24 matrix is computed in a single call to the /table API.',
    travelTimeText2:
      'A Google Distance Matrix API script is also available for comparison with real traffic data ($2.88 per computation, covered by the free $200/month credit).',
    populationTitle: 'Population Data',
    populationText:
      'Population estimates come from the JICA report "Projet d\'Élaboration du Plan Directeur des Transports Urbains de la Ville de Kinshasa" (2019). The 2030 and 2040 projections are demographic trend extrapolations. The last official DRC census dates from 1984; intermediate data relies on household surveys and satellite imagery.',
    sourcesTitle: 'Data sources by layer',
    downloadBibtex: 'Download BibTeX',
    methodologyLabel: 'Methodology:',
    limitsLabel: 'Limitations:',
    licenseTitle: 'License',
    licenseText:
      'OpenStreetMap data is licensed under <a href="https://opendatacommons.org/licenses/odbl/" target="_blank">ODbL</a>. The source code of this application is available on <a href="https://github.com/fsalmon-me/kinshasa-research" target="_blank">GitHub</a>.',
  },

  // ── Fuel report content (generated report strings) ──
  fuelReport: {
    title: 'Fuel Supply & Demand — Kinshasa',
    slug: 'fuel-supply-demand',
    description:
      'Analysis of fuel supply ({stations} fuel stations) and demand ({demand} m³/day in 2025) for the 24 communes of Kinshasa.',
    h1: 'Fuel Supply & Demand in Kinshasa',
    intro1:
      'This report analyses the relationship between fuel station supply and estimated fuel demand for the 24 communes of Kinshasa. The metropolitan area has approximately {pop} inhabitants (2025 projections, UN/Macrotrends) and consumes approximately {demand} m³ of fuel per day, i.e. {demandL} litres/day. Consumption is projected to reach {demand2030} m³/day by 2030 and {demand2040} m³/day by 2040 (PDTK Scenario B), driven by population growth and rising motorisation (currently ~4% of households, ×6.3 by 2040 per EDS-DRC III 2024).',
    intro2:
      'Supply is assessed through the {stations} fuel stations identified in OpenStreetMap (Overpass API, February 2026). This source may underestimate the actual number of informal fuel outlets.',
    demandTitle: 'Fuel demand by commune',
    demandText:
      'The table below presents daily fuel demand by commune for the 2025, 2030 and 2040 horizons. The five largest consuming communes in 2025 are {top5}.',
    demandTableTitle: 'Fuel demand (m³/day) — projections',
    demandChartTitle: 'Fuel demand by commune (m³/day)',
    colCommune: 'Commune',
    colPop: 'Pop. 2025',
    col2025: '2025 (m³/d)',
    col2030: '2030 (m³/d)',
    col2040: '2040 (m³/d)',
    densityTitle: 'Demand density',
    densityText:
      'Demand density is expressed in two ways: per capita (litres/person/day) and per area (m³/day/km²). The most spatially dense communes are {top5}. These indicators allow comparison of demand intensity between communes of different sizes.',
    densityTableTitle: 'Demand density — 2025',
    densityChartTitle: 'Demand per capita (L/pers/day) — 2025',
    colSurface: 'Area (km²)',
    colPerCapita: 'L/pers/day',
    colPerKm2: 'm³/day/km²',
    supplyTitle: 'Fuel station supply',
    supplyText:
      "Kinshasa has {stations} fuel stations listed in OpenStreetMap. Distribution is very uneven: {topStations} concentrate the majority of supply, while {noStationText}",
    noStationAll: 'all communes have at least one station.',
    noStationSome: '{count} communes have no listed station ({names}).',
    supplyWarning:
      '⚠ This source (OSM) does not list informal fuel outlets or private depots. Actual supply coverage may differ significantly.',
    imbalanceTitle: 'Supply / demand imbalance',
    saturation:
      '{count} communes are classified as resident demographic saturation by the PDTK (density >500 pers/ha): {names}. In these communes, consumption growth is driven by motorisation and flow intensification rather than resident population growth.',
    periphery:
      "Peripheral communes (Nsele, Maluku, Mont-Ngafula) show the highest absolute volumes but low spatial demand density. Fuel station supply, concentrated in central communes, does not follow demand growth in the periphery — a key factor for infrastructure planning.",
    growth:
      'Total demand is expected to grow from {from} to {to} m³/day between 2025 and 2040, an increase of {pct}%. Without significant distribution network expansion, several peripheral communes risk recurring supply shortages.',
    travelTitle: 'Inter-communal travel times and distances',
    travelText:
      'The matrix below presents travel times (in minutes) between the 24 communes during daytime hours (9am–4pm), calculated using a congestion model calibrated on OSRM data. Distances (in kilometres) are shown in a second table.',
    durationTableTitle: 'Inter-communal travel times — Daytime (9am–4pm) — minutes',
    distanceTableTitle: 'Inter-communal distances — km',
    methodologyTitle: 'Methodology',
    methodologyText1:
      'Daily communal demand is modelled as: Dⱼ = f(Population, Motorisation, Electric deficit, Industry). Population 2025: 17.77M (UN/Macrotrends). Demographic projections: PDTK Scenario B. Motorisation rate: 4% of households (EDS-DRC III 2024), projected ×6.3 by 2040. Metropolitan reference consumption: 3,000 m³/day (Min. Economy, April 2025). Communal values are normalised so their sum equals metropolitan totals.',
    methodologyText2:
      "Fuel station supply is extracted from OpenStreetMap via Overpass API (tag amenity=fuel), geolocated and counted per commune via point-in-polygon geometric intersection. Communes are defined by OSM polygons from the communes.geojson file.",
    sourcesTitle: 'Sources & References',
    srcDemandData: 'Demand data (fuel-demand.json)',
    srcDemandDesc: 'Spatial modelling of hydrocarbon demand by commune 2025-2040',
    srcStationsData: 'Fuel stations (fuel.geojson)',
    srcStationsDesc: '{count} fuel stations extracted from OpenStreetMap',
    srcCommunesData: 'Commune polygons (communes.geojson)',
    srcCommunesDesc: 'Administrative boundaries of the 24 communes of Kinshasa, OSM source',
    srcTravelData: 'Travel matrix (travel-kinshasa.json)',
    srcTravelDesc: 'OD matrix 24×24 with 5 congestion profiles, distances and durations',
    srcJica: 'JICA — Kinshasa Transport Master Plan (PDTK)',
    srcJicaDesc: 'Scenario B demographic projections, demographic saturation classification',
    srcMinEco: 'DRC Ministry of Economy — Metropolitan consumption',
    srcMinEcoDesc: 'Consumption data: 3,000 m³/day for the Kinshasa metropolitan area',
    srcEds: 'EDS-DRC III — Demographic and Health Survey',
    srcEdsDesc: 'Congolese household motorisation rate: ~4%, projected ×6.3 by 2040',
    srcSnel: 'SNEL / AZES — Electric deficit by commune',
    srcSnelDesc: 'Electric deficit data influencing generator fuel demand',
    srcUn: 'United Nations DESA — World Urbanization Prospects',
    srcUnDesc: 'Kinshasa population 2025: 17.77 million',
    srcMacrotrends: 'Macrotrends — Kinshasa Population',
    srcMacrotrendsDesc: 'Complementary demographic projections',
    srcOsm: 'OpenStreetMap — Overpass API',
    srcOsmDesc: 'Fuel station extraction (amenity=fuel) in the Kinshasa metropolitan area',

    // ── Stations per commune section ──
    stationsTitle: 'Fuel stations by commune',
    stationsText:
      'The table below presents the number of fuel stations identified per commune in OpenStreetMap. Distribution is heavily concentrated in central communes.',
    stationsTableTitle: 'Number of fuel stations per commune',
    colStations: 'Stations',

    // ── GDP per capita section ──
    gdpTitle: 'Estimated GDP per capita by commune',
    gdpText:
      'GDP per capita is estimated by triangulating three variables: the wealth index (EDS-DRC III 2024), median property values (Texaf, SEP Congo), and digital connectivity (ARPCE). Communes are classified into 5 tiers (Tier 1 = highest).',
    gdpTableTitle: 'Estimated GDP per capita (USD) — 2024',
    gdpChartTitle: 'GDP per capita by commune (USD)',
    colGdpPerCapita: 'GDP/cap (USD)',
    colDistrict: 'District',
    colTier: 'Tier',
    colClassification: 'Classification',

    // ── CAPEX / OPEX section ──
    capexTitle: 'Fuel station installation and operational costs',
    capexText:
      'The estimated costs below concern the construction of a standard fuel station (1,000 m²) in each commune. Land cost varies significantly by commune; the material CAPEX (USD 280,000) is constant.',
    capexTableTitle: 'CAPEX / OPEX by commune — Fuel station 1,000 m²',
    capexChartTitle: 'Total CAPEX by commune (USD)',
    colLandValue: 'Land (USD/m²)',
    colLandCost: 'Land cost (USD)',
    colCapexMaterial: 'Material CAPEX (USD)',
    colCapexTotal: 'Total CAPEX (USD)',
    colOpex: 'Monthly OPEX (USD)',

    // ── Truck logistics section ──
    truckTitle: 'Logistics costs — Fuel tanker',
    truckText:
      'The logistics parameters below are used to estimate the cost of transporting fuel from the main depot (SEP Congo, Limete) to fuel stations across the 24 communes.',
    truckTableTitle: 'Logistics parameters — 35,000 L fuel tanker',
    colParameter: 'Parameter',
    colValue: 'Value',
    colUnit: 'Unit',
    truckCapacity: 'Capacity',
    truckLoading: 'Loading cost',
    truckUnloading: 'Unloading cost',
    truckCostKm: 'Cost per kilometre',
    truckLabor: 'Labour cost / hour',
    truckLoadingM3: 'Loading cost / m³',

    // ── Revenue per liter section ──
    revenueTitle: 'Expected revenue per litre and supplier purchase price',
    revenueText:
      'Expected revenue per litre combines the net fuel margin (115 CDF/L, set by ministerial decree) and a variable ancillary margin depending on the commune\'s consumption type. The supplier purchase price (SEP Congo depot) is 3,208 CDF/L.',
    revenueTableTitle: 'Expected revenue per litre by commune (CDF)',
    revenueChartTitle: 'Expected revenue by commune (CDF/L)',
    colConsumptionType: 'Consumption type',
    colFuelMargin: 'Fuel margin (CDF/L)',
    colAncillaryMargin: 'Ancillary margin (CDF/L)',
    colExpectedRevenue: 'Expected revenue (CDF/L)',
    colSupplierPrice: 'Supplier price (CDF/L)',

    // ── New external sources ──
    srcWorldBank: 'World Bank — Development Indicators',
    srcWorldBankDesc: 'DRC GDP per capita (nominal and PPP), urbanisation coefficient',
    srcTradingEconomics: 'Trading Economics — DRC GDP per capita',
    srcTradingEconomicsDesc: 'DRC GDP per capita time series, IMF/World Bank data',
    srcInsDhs: 'INS / EDS-DRC III — Demographic and Health Survey 2024',
    srcInsDhsDesc: 'Household wealth index by province, service access rates',
    srcNumbeo: 'Numbeo — Cost of Living Kinshasa',
    srcNumbeoDesc: 'Cost of living and property prices in Kinshasa, international comparisons',
    srcPaylab: 'Paylab / SalaryExplorer — DRC Salaries',
    srcPaylabDesc: 'Salary data by sector in the DRC',
    srcSepCongo: 'SEP Congo — Logistics data',
    srcSepCongoDesc: 'Supply costs, supplier depot price Limete',
    srcTexaf: 'Texaf — Kinshasa Property Report',
    srcTexafDesc: 'Land and property values by commune of Kinshasa',
    srcMinPlan: 'Ministry of Planning — Economic projections',
    srcMinPlanDesc: 'Provincial GDP projections and socio-economic indicators',
    srcArpce: 'ARPCE — Digital connectivity',
    srcArpceDesc: 'Mobile and internet coverage data by commune',

    // ── Extended methodology ──
    methodologyGdp:
      'Communal GDP per capita is estimated by triangulating three proxy variables: (1) household wealth index (EDS-DRC III 2024), (2) median property value (Texaf, SEP Congo), and (3) digital connectivity — mobile and internet penetration (ARPCE). These three indicators are normalised, weighted and calibrated against national GDP per capita (World Bank, Trading Economics). Communes are classified into 5 tiers (Tier 1 = GDP/cap > USD 3,000, Tier 5 < USD 600).',
    methodologyCosts:
      'Land costs are derived from property data (Texaf, Numbeo) and observed transactions. The material CAPEX for a standard station (USD 280,000) is based on sub-regional operator quotes. Monthly OPEX includes salaries (Paylab/SalaryExplorer), energy, maintenance and local taxes.',
    methodologyRevenue:
      'The net fuel margin (115 CDF/L) is set by ministerial decree. The ancillary margin ranges from 2 to 195 CDF/L depending on the commune\'s dominant consumption type (road transport, generators, informal trade). The supplier purchase price (3,208 CDF/L) is the SEP Congo depot price, Limete.',
    logLoading: 'Loading data…',
    logBuilding: 'Building report…',
    logDone: '✅ Report generated: {count} blocks',
  },
}
