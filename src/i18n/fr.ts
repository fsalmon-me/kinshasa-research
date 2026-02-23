export default {
  // ── Common / shared ──
  common: {
    back: 'Retour',
    map: 'Carte',
    reports: 'Rapports',
    admin: 'Admin',
    about: 'À propos',
    save: 'Sauvegarder',
    saving: 'Sauvegarde…',
    delete: 'Supprimer',
    cancel: 'Annuler',
    apply: 'Appliquer',
    add: 'Ajouter',
    export: 'Exporter',
    import: 'Importer',
    close: 'Fermer',
    loading: 'Chargement…',
    error: 'Erreur',
    copy: 'Copier',
    search: 'Rechercher',
    noData: 'Aucune donnée disponible.',
    confirm: 'Confirmer',
  },

  // ── Categories ──
  categories: {
    statistics: 'Données statistiques',
    infrastructure: 'Infrastructure',
    poi: "Points d'intérêt",
    transport: 'Transport',
    other: 'Autre',
    statisticsIcon: '📊 Statistiques',
    infrastructureIcon: '🛣️ Infrastructure',
    poiIcon: "📍 Points d'intérêt",
    transportIcon: '🚗 Transport',
    otherIcon: '📦 Autre',
  },

  // ── Login page ──
  login: {
    title: 'Connexion Admin',
    subtitle: 'Kinshasa Research — Accès réservé',
    email: 'Email',
    password: 'Mot de passe',
    submit: 'Se connecter',
    connecting: 'Connexion…',
    backToMap: 'Retour à la carte',
  },

  // ── Layer panel ──
  layers: {
    title: 'Couches',
    source: 'Source :',
    license: 'Licence :',
    date: 'Date :',
    methodology: 'Méthodologie :',
    limitations: 'Limites :',
    viewSource: 'Voir la source →',
  },

  // ── Sources panel ──
  sources: {
    toggle: 'Sources',
    title: 'Sources & Méthodologie',
    methodology: 'Méthodologie :',
    notes: 'Notes :',
  },

  // ── Congestion bar ──
  congestion: {
    label: '🕐 Heure de trajet :',
  },

  // ── Commune sidebar ──
  commune: {
    population: '👥 Population',
    activeData: '📊 Données actives',
    poi: "📍 Points d'intérêt",
  },

  // ── Search bar ──
  searchBar: {
    placeholder: 'Rechercher commune ou lieu… (Ctrl+K)',
  },

  // ── Reports page ──
  reportsPage: {
    newReport: 'Nouveau rapport',
    noReports: 'Aucun rapport disponible',
    emptyText: "Les rapports permettent d'analyser les données géographiques de Kinshasa.",
    createReport: 'Créer un rapport',
    allReports: 'Tous les rapports',
  },

  // ── Report editor page ──
  editor: {
    newReport: 'Nouveau rapport',
    save: '💾 Sauvegarder',
    saving: 'Sauvegarde…',
    savedOk: '✓ Rapport sauvegardé',
    errorPrefix: '✗ Erreur :',
    delete: 'Supprimer',
    confirmDelete: 'Supprimer « {title} » ?',
    generate: '🔄 Générer',
    generating: 'Génération…',
    fuelReport: 'Offre & Demande de Carburant',
    generatedOk: '✓ Rapport généré ({count} blocs) — Cliquer 💾 pour sauvegarder sur Firestore',
    errorGenerate: '✗ Erreur de génération :',
    unknownGenerator: 'Générateur inconnu : {type}',
    jsonCopied: '📋 JSON copié dans le presse-papier',
    blocksUpdated: '✓ Blocs mis à jour depuis JSON',
    invalidJson: '✗ JSON invalide :',
    jsonEdit: 'Édition JSON des blocs',
    copyJson: 'Copier le JSON',
    copy: 'Copier',
    debugGenerated: 'Rapport généré ({count} blocs)',
    metaTitle: 'Titre',
    metaTitlePlaceholder: 'Titre du rapport',
    metaSlug: 'Slug',
    metaSlugPlaceholder: 'auto-généré',
    metaDescription: 'Description',
    metaDescPlaceholder: 'Description courte',
    addLabel: 'Ajouter',
    blockTitle: 'Titre',
    blockText: 'Texte',
    blockTable: 'Tableau',
    blockChart: 'Graphique',
    blockSources: 'Sources',
  },

  // ── Block editor ──
  blockEditor: {
    moveUp: 'Monter',
    moveDown: 'Descendre',
    delete: 'Supprimer',
  },

  // ── Report table block ──
  tableBlock: {
    error: 'Erreur : {message}',
    empty: 'Aucune donnée disponible.',
  },

  // ── Report sources block ──
  sourcesBlock: {
    dataUsed: 'Données utilisées',
    externalRefs: 'Références externes',
    noSources: 'Aucune source renseignée.',
    addSource: '+ Ajouter une source',
    labelPlaceholder: 'Intitulé de la source *',
    urlPlaceholder: 'URL (optionnel)',
    datePlaceholder: 'Date (optionnel)',
    descriptionPlaceholder: 'Description (optionnel)',
    delete: 'Supprimer',
  },

  // ── Admin page ──
  adminPage: {
    title: 'Administration des données',
    export: 'Exporter',
    import: 'Importer',
    exportTooltip: 'Exporter les annotations (JSON)',
    importTooltip: 'Importer des annotations depuis un fichier JSON',
    logout: 'Se déconnecter',
    searchPlaceholder: 'Rechercher dans les données…',
    loadError: 'Erreur de chargement :',
    importError: "Erreur d'import :",
    modSaved: 'Modification enregistrée en mémoire',
    verifiedUpdated: 'Statut vérifié mis à jour',
    exported: 'Fichier metadata-overrides.json exporté',
    importSuccess: 'Overrides importées avec succès',
    crystallised: 'téléchargé — placez-le dans public/data/ et commitez',
    entries: 'Entrées',
    named: 'Nommés',
    verified: 'Vérifiés',
    crystallise: 'Cristalliser',
    crystalliseTooltip: 'Télécharger le JSON enrichi pour commit dans public/data/',
    exportEnriched: 'Export enrichi',
    draftTooltip: 'Couche en brouillon — non visible sur la carte',
    todoTitle: 'À enrichir',
    todoPlaceholder: 'Nouvelle tâche…',
    noTodos: 'Aucune tâche',
    durations: 'Durées',
    distances: 'Distances',
    speed: 'Vitesse',
    fast: 'Rapide',
    slow: 'Lent',
    short: 'Court',
    long: 'Long',
    verifiedLabel: 'Vérifié',
    notVerified: 'Non vérifié',
    noResults: 'Aucun résultat pour cette recherche.',
    noData: 'Aucune donnée.',
    selectLayer: 'Sélectionnez une couche dans le menu de gauche.',
  },

  // ── About page ──
  aboutPage: {
    title: 'À propos — Sources & Méthodologie',
    objectiveTitle: 'Objectif',
    objectiveText:
      "Cette carte interactive présente des données géospatiales sur la ville de Kinshasa, République Démocratique du Congo. Elle est conçue pour servir de support à la recherche universitaire, en documentant rigoureusement toutes les sources de données et les décisions méthodologiques.",
    architectureTitle: 'Architecture technique',
    mapping: 'Cartographie',
    osmTiles: 'tuiles OpenStreetMap',
    geoData: 'Données géographiques',
    statData: 'Données statistiques',
    travelTime: 'temps de trajet',
    hosting: 'Hébergement',
    static: 'statique, aucun serveur',
    methodologyTitle: 'Méthodologie',
    communeBoundariesTitle: 'Limites communales',
    communeBoundariesText:
      "Les 24 communes de Kinshasa sont extraites d'OpenStreetMap via l'API Overpass (admin_level=7, correspondant aux communes dans la hiérarchie administrative de la RDC). Les relations OSM sont converties en polygones GeoJSON. Le niveau 8 (quartiers) n'est pas utilisé car la granularité des données statistiques disponibles s'arrête au niveau communal.",
    roadNetworkTitle: 'Réseau routier',
    roadNetworkText1: 'Le réseau routier est séparé en deux couches pour optimiser les performances :',
    mainRoads: 'Routes principales',
    minorRoads: 'Routes mineures',
    roadNetworkText2:
      "Les coordonnées sont arrondies à 5 décimales (~1.1m de précision) pour réduire la taille des fichiers. La couverture OSM des routes résidentielles est inégale — plus complète dans les communes centrales que périphériques.",
    poiTitle: "Points d'intérêt",
    poiText:
      "Tous les POI proviennent d'OpenStreetMap (licence ODbL). Les requêtes Overpass ciblent des tags spécifiques (amenity=hospital, amenity=school, etc.). La couverture est variable : bonne pour les écoles (campagnes HOT/Missing Maps), modérée pour la santé et les stations-service, faible pour les marchés informels.",
    travelTimeTitle: 'Temps de trajet',
    travelTimeText1:
      "Les temps de trajet inter-communaux sont calculés via OSRM (Open Source Routing Machine) utilisant les données routières OSM. Pour chaque commune, le point de référence est le centroïde géographique accroché à la route la plus proche (via OSRM /nearest), évitant ainsi de placer le point au milieu d'une zone non accessible (forêt, rivière). La matrice 24×24 est calculée en un seul appel à l'API /table.",
    travelTimeText2:
      "Un script Google Distance Matrix API est également disponible pour comparaison avec données de trafic réel ($2.88 par calcul, couvert par le crédit gratuit de $200/mois).",
    populationTitle: 'Données de population',
    populationText:
      'Les estimations de population proviennent du rapport JICA "Projet d\'Élaboration du Plan Directeur des Transports Urbains de la Ville de Kinshasa" (2019). Les projections 2030 et 2040 sont des extrapolations de tendances démographiques. Le dernier recensement officiel de la RDC date de 1984 ; les données intermédiaires reposent sur des enquêtes ménages et de l\'imagerie satellitaire.',
    sourcesTitle: 'Sources des données par couche',
    downloadBibtex: 'Télécharger BibTeX',
    methodologyLabel: 'Méthodologie :',
    limitsLabel: 'Limites :',
    licenseTitle: 'Licence',
    licenseText:
      'Les données OpenStreetMap sont sous licence <a href="https://opendatacommons.org/licenses/odbl/" target="_blank">ODbL</a>. Le code source de cette application est disponible sur <a href="https://github.com/fsalmon-me/kinshasa-research" target="_blank">GitHub</a>.',
  },

  // ── Fuel report content (generated report strings) ──
  fuelReport: {
    title: 'Offre & Demande de Carburant — Kinshasa',
    slug: 'offre-demande-carburant',
    description:
      "Analyse de l'offre ({stations} stations-service) et de la demande de carburant ({demand} m³/jour en 2025) pour les 24 communes de Kinshasa.",
    h1: 'Offre & Demande de Carburant à Kinshasa',
    intro1:
      "Ce rapport analyse la relation entre l'offre en stations-service et la demande de carburant estimée pour les 24 communes de Kinshasa. La métropole compte environ {pop} habitants (projections 2025, ONU/Macrotrends) et consomme environ {demand} m³ de carburant par jour, soit {demandL} litres/jour. Cette consommation est projetée à {demand2030} m³/jour en 2030 et {demand2040} m³/jour en 2040 (scénario PDTK B), portée par la croissance démographique et la montée de la motorisation (actuellement ~4% des ménages, ×6,3 d'ici 2040 selon EDS-RDC III 2024).",
    intro2:
      "L'offre est évaluée via les {stations} stations-service identifiées dans OpenStreetMap (Overpass API, février 2026). Cette source peut sous-estimer le nombre réel de points de vente informels de carburant.",
    demandTitle: 'Demande de carburant par commune',
    demandText:
      'Le tableau ci-dessous présente la demande journalière en carburant par commune pour les horizons 2025, 2030 et 2040. Les cinq communes les plus consommatrices en 2025 sont {top5}.',
    demandTableTitle: 'Demande de carburant (m³/jour) — projections',
    demandChartTitle: 'Demande de carburant par commune (m³/jour)',
    colCommune: 'Commune',
    colPop: 'Pop. 2025',
    col2025: '2025 (m³/j)',
    col2030: '2030 (m³/j)',
    col2040: '2040 (m³/j)',
    densityTitle: 'Densité de demande',
    densityText:
      "La densité de demande est exprimée de deux façons : par habitant (litres/personne/jour) et par superficie (m³/jour/km²). Les communes les plus denses spatialement sont {top5}. Ces indicateurs permettent de comparer l'intensité de la demande entre communes de tailles différentes.",
    densityTableTitle: 'Densité de demande — 2025',
    densityChartTitle: 'Demande par habitant (L/pers/jour) — 2025',
    colSurface: 'Surface (km²)',
    colPerCapita: 'L/pers/jour',
    colPerKm2: 'm³/jour/km²',
    supplyTitle: 'Offre en stations-service',
    supplyText:
      "Kinshasa compte {stations} stations-service référencées dans OpenStreetMap. La distribution est très inégale : {topStations} concentrent la majorité de l'offre, tandis que {noStationText}",
    noStationAll: 'toutes les communes ont au moins une station.',
    noStationSome: "{count} communes n'ont aucune station recensée ({names}).",
    supplyWarning:
      "⚠ Cette source (OSM) ne recense pas les points de vente informels de carburant ni les dépôts privés. La couverture réelle en approvisionnement peut être significativement différente.",
    imbalanceTitle: 'Déséquilibre offre / demande',
    saturation:
      "{count} communes sont classées en saturation démographique résidente par le PDTK (densité >500 pers/ha) : {names}. Dans ces communes, la croissance de la consommation est portée par la motorisation et l'intensification des flux plutôt que par la croissance de la population résidente.",
    periphery:
      "Les communes périphériques (Nsele, Maluku, Mont-Ngafula) présentent les volumes absolus les plus élevés mais une faible densité spatiale de demande. L'offre en stations-service, concentrée dans les communes centrales, ne suit pas la croissance de la demande en périphérie — un facteur clé pour la planification d'infrastructure.",
    growth:
      "La demande totale devrait passer de {from} à {to} m³/jour entre 2025 et 2040, soit une augmentation de {pct}%. Sans expansion significative du réseau de distribution, plusieurs communes périphériques risquent des pénuries récurrentes d'approvisionnement.",
    travelTitle: 'Temps de trajet et distances inter-communaux',
    travelText:
      'La matrice ci-dessous présente les temps de trajet (en minutes) entre les 24 communes en période diurne (9h–16h), calculés via un modèle de congestion calibré sur les données OSRM. Les distances (en kilomètres) sont indiquées dans un second tableau.',
    durationTableTitle: 'Temps de trajet inter-communaux — Journée (9h–16h) — minutes',
    distanceTableTitle: 'Distances inter-communales — km',
    methodologyTitle: 'Méthodologie',
    methodologyText1:
      "La demande journalière communale est modélisée par : Dⱼ = f(Population, Motorisation, Déficit électrique, Industrie). Population 2025 : 17,77 M (ONU/Macrotrends). Projections démographiques : PDTK Scénario B. Taux de motorisation : 4% des ménages (EDS-RDC III 2024), projeté ×6,3 d'ici 2040. Consommation métropolitaine de référence : 3 000 m³/jour (Min. Économie, avril 2025). Les valeurs communales sont normalisées pour que leur somme équivaille aux totaux métropolitains.",
    methodologyText2:
      "L'offre en stations-service est extraite d'OpenStreetMap via Overpass API (tag amenity=fuel), géolocalisée et comptée par commune via intersection géométrique point-dans-polygone. Les communes sont définies par les polygones OSM du fichier communes.geojson.",
    sourcesTitle: 'Sources & Références',
    srcDemandData: 'Données de demande (fuel-demand.json)',
    srcDemandDesc: 'Modélisation spatiale de la demande en hydrocarbures par commune 2025-2040',
    srcStationsData: 'Stations-service (fuel.geojson)',
    srcStationsDesc: "{count} stations-service extraites d'OpenStreetMap",
    srcCommunesData: 'Polygones communes (communes.geojson)',
    srcCommunesDesc: 'Limites administratives des 24 communes de Kinshasa, source OSM',
    srcTravelData: 'Matrice de trajet (travel-kinshasa.json)',
    srcTravelDesc: 'Matrice OD 24×24 avec 5 profils de congestion, distances et durées',
    srcJica: 'JICA — Plan Directeur des Transports de Kinshasa (PDTK)',
    srcJicaDesc: 'Projections démographiques Scénario B, classification saturation démographique',
    srcMinEco: "Ministère de l'Économie RDC — Consommation métropolitaine",
    srcMinEcoDesc: 'Données de consommation : 3 000 m³/jour pour la métropole de Kinshasa',
    srcEds: 'EDS-RDC III — Enquête Démographique et de Santé',
    srcEdsDesc: "Taux de motorisation des ménages congolais : ~4%, projection ×6,3 d'ici 2040",
    srcSnel: 'SNEL / AZES — Déficit électrique par commune',
    srcSnelDesc: 'Données de déficit électrique influençant la demande en groupes électrogènes',
    srcUn: 'United Nations DESA — World Urbanization Prospects',
    srcUnDesc: 'Population Kinshasa 2025 : 17,77 millions',
    srcMacrotrends: 'Macrotrends — Kinshasa Population',
    srcMacrotrendsDesc: 'Projections démographiques complémentaires',
    srcOsm: 'OpenStreetMap — Overpass API',
    srcOsmDesc: 'Extraction des stations-service (amenity=fuel) dans la métropole de Kinshasa',

    // ── Stations per commune section ──
    stationsTitle: 'Stations-service par commune',
    stationsText:
      "Le tableau ci-dessous présente le nombre de stations-service identifiées par commune dans OpenStreetMap. La répartition est fortement concentrée dans les communes centrales.",
    stationsTableTitle: 'Nombre de stations-service par commune',
    colStations: 'Stations',

    // ── GDP per capita section ──
    gdpTitle: 'PIB par habitant estimé par commune',
    gdpText:
      "Le PIB par habitant est estimé par triangulation de trois variables : l'indice de richesse (EDS-RDC III 2024), la valeur immobilière médiane (Texaf, SEP Congo) et la connectivité numérique (ARPCE). Les communes sont classées en 5 niveaux (Tier 1 = le plus élevé).",
    gdpTableTitle: 'PIB par habitant estimé (USD) — 2024',
    gdpChartTitle: 'PIB par habitant par commune (USD)',
    colGdpPerCapita: 'PIB/hab (USD)',
    colDistrict: 'District',
    colTier: 'Niveau',
    colClassification: 'Classification',

    // ── CAPEX / OPEX section ──
    capexTitle: "Coûts d'installation et opérationnels d'une station-service",
    capexText:
      "Les coûts estimés ci-dessous concernent l'implantation d'une station-service standard (1 000 m²) dans chaque commune. Le coût foncier varie fortement selon la commune ; le CAPEX matériel (280 000 USD) est constant.",
    capexTableTitle: 'CAPEX / OPEX par commune — Station-service 1 000 m²',
    capexChartTitle: 'CAPEX total par commune (USD)',
    colLandValue: 'Foncier (USD/m²)',
    colLandCost: 'Coût terrain (USD)',
    colCapexMaterial: 'CAPEX matériel (USD)',
    colCapexTotal: 'CAPEX total (USD)',
    colOpex: 'OPEX mensuel (USD)',

    // ── Truck logistics section ──
    truckTitle: 'Coûts logistiques — Camion-citerne',
    truckText:
      "Les paramètres logistiques ci-dessous sont utilisés pour estimer le coût d'acheminement du carburant du dépôt principal (SEP Congo, Limete) vers les stations-service des 24 communes.",
    truckTableTitle: 'Paramètres logistiques — Camion-citerne 35 000 L',
    colParameter: 'Paramètre',
    colValue: 'Valeur',
    colUnit: 'Unité',
    truckCapacity: 'Capacité',
    truckLoading: 'Coût de chargement',
    truckUnloading: 'Coût de déchargement',
    truckCostKm: 'Coût au kilomètre',
    truckLabor: 'Coût main-d\'œuvre / heure',

    // ── Revenue per liter section ──
    revenueTitle: 'Revenu espéré par litre et prix d\'achat fournisseur',
    revenueText:
      "Le revenu espéré par litre intègre la marge nette sur le carburant (115 CDF/L, fixée par arrêté) et une marge auxiliaire variable selon le type de consommation de la commune. Le prix d'achat fournisseur (sortie dépôt SEP Congo) est estimé à ~966 CDF/L (moyenne pondérée : 40 % Super à 923 CDF/L + 60 % Gasoil à 995 CDF/L).",
    revenueTableTitle: 'Revenu espéré par litre par commune (CDF)',
    revenueChartTitle: 'Revenu espéré par commune (CDF/L)',
    colConsumptionType: 'Type de consommation',
    colFuelMargin: 'Marge carburant (CDF/L)',
    colAncillaryMargin: 'Marge auxiliaire (CDF/L)',
    colExpectedRevenue: 'Revenu espéré (CDF/L)',
    colSupplierPrice: 'Prix fournisseur (CDF/L)',

    // ── New external sources ──
    srcWorldBank: 'Banque Mondiale — Indicateurs du développement',
    srcWorldBankDesc: "PIB RDC par habitant (nominal et PPA), coefficient d'urbanisation",
    srcTradingEconomics: 'Trading Economics — DRC GDP per capita',
    srcTradingEconomicsDesc: 'Série temporelle PIB par habitant RDC, données FMI/Banque Mondiale',
    srcInsDhs: 'INS / EDS-RDC III — Enquête Démographique et de Santé 2024',
    srcInsDhsDesc: "Indice de richesse des ménages par province, taux d'accès aux services",
    srcNumbeo: 'Numbeo — Cost of Living Kinshasa',
    srcNumbeoDesc: 'Coût de la vie et prix immobiliers à Kinshasa, comparaisons internationales',
    srcPaylab: 'Paylab / SalaryExplorer — Salaires RDC',
    srcPaylabDesc: 'Données salariales par secteur en RDC',
    srcSepCongo: 'SEP Congo — Données logistiques',
    srcSepCongoDesc: "Coûts d'approvisionnement, prix fournisseur dépôt Limete",
    srcTexaf: 'Texaf — Rapport immobilier Kinshasa',
    srcTexafDesc: 'Valeurs foncières et immobilières par commune de Kinshasa',
    srcMinPlan: 'Ministère du Plan — Projections économiques',
    srcMinPlanDesc: 'Projections PIB provincial et indicateurs socio-économiques',
    srcArpce: 'ARPCE — Connectivité numérique',
    srcArpceDesc: 'Données de couverture mobile et internet par commune',

    // ── Extended methodology ──
    methodologyGdp:
      "Le PIB par habitant communal est estimé par triangulation de trois variables proxy : (1) l'indice de richesse des ménages (EDS-RDC III 2024), (2) la valeur immobilière médiane (Texaf, SEP Congo), et (3) la connectivité numérique — taux de pénétration mobile et internet (ARPCE). Ces trois indicateurs sont normalisés, pondérés et calibrés sur le PIB national par habitant (Banque Mondiale, Trading Economics). Les communes sont classées en 5 niveaux (Tier 1 = PIB/hab > 3 000 USD, Tier 5 < 600 USD).",
    methodologyCosts:
      "Les coûts fonciers sont dérivés des données immobilières (Texaf, Numbeo) et des transactions observées. Le CAPEX matériel d'une station standard (280 000 USD) est basé sur les devis d'opérateurs de la sous-région. L'OPEX mensuel inclut les salaires (Paylab/SalaryExplorer), l'énergie, la maintenance et les taxes locales.",
    methodologyRevenue:
      "La marge nette sur le carburant (115 CDF/L) est fixée par arrêté ministériel. La marge auxiliaire varie de 2 à 195 CDF/L selon le type de consommation dominante de la commune (transport routier, groupes électrogènes, commerce informel). Le prix d'achat fournisseur (~966 CDF/L) est la moyenne pondérée des prix sortie dépôt : Super à 923 CDF/L (40 %) et Gasoil à 995 CDF/L (60 %).",
    logLoading: 'Chargement des données…',
    logBuilding: 'Construction du rapport…',
    logDone: '✅ Rapport généré : {count} blocs',
  },
}
