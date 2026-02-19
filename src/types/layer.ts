// =============================================
// Layer configuration types
// =============================================
// Each entry in layers.json conforms to one of these types.
// The system supports 5 types of layers:
//   - choropleth: colored polygons (e.g. population by commune)
//   - markers:    point features (e.g. gas stations, schools)
//   - geojson:    raw GeoJSON overlay styled by property (e.g. roads)
//   - matrix:     commune-to-commune travel time heatmap
//   - heatmap:    (future) density heatmap
// =============================================

/** Academic citation / provenance metadata for a layer */
export interface LayerMetadata {
  source: string             // "JICA" | "OpenStreetMap" | "Google Maps API"
  title?: string             // Document or dataset title
  authors?: string[]         // Author list
  year?: number              // Publication year
  url?: string               // URL to source document
  license?: string           // "ODbL" | "CC BY 4.0" etc.
  accessDate?: string        // ISO date when data was fetched
  methodology?: string       // How data was collected/processed
  notes?: string             // Additional info
}

export interface LayerBase {
  id: string
  name: string
  type: string
  category?: 'statistics' | 'infrastructure' | 'poi' | 'transport'
  description: string
  visible: boolean
  metadata?: LayerMetadata
}

/** Choropleth layer: data JSON joined to a polygon GeoJSON */
export interface ChoroplethLayer extends LayerBase {
  type: 'choropleth'
  dataFile: string
  geojsonFile: string
  joinField: string          // field in dataFile to match
  geojsonJoinField: string   // field in geojson properties to match
  yearMap: Record<string, string>  // { "2017": "pop_2017", ... }
  defaultYear: string
  thresholds: number[]
  colors: string[]           // length = thresholds.length + 1
  unit: string
  legendTitle: string
}

/** Marker layer: point features from flat JSON or GeoJSON */
export interface MarkerLayer extends LayerBase {
  type: 'markers'
  dataFile?: string          // flat JSON array (legacy)
  geojsonFile?: string       // GeoJSON FeatureCollection (preferred)
  latField?: string          // required if dataFile
  lngField?: string          // required if dataFile
  labelField: string         // property used as popup title
  color?: string
  radius?: number
  icon?: string
  popupFields?: string[]
  fieldLabels?: Record<string, string>  // { "beds": "Lits", "phone": "Téléphone" }
  legendTitle?: string
}

/** Raw GeoJSON overlay styled by a property value */
export interface GeoJsonLayer extends LayerBase {
  type: 'geojson'
  geojsonFile: string
  styleProperty?: string
  styleMap?: Record<string, { color: string; weight: number; label: string }>
  defaultStyle?: { color: string; weight: number }
  popupFields?: string[]
  fieldLabels?: Record<string, string>
  legendTitle?: string
}

/** Matrix layer: commune-to-commune travel time */
export interface MatrixLayer extends LayerBase {
  type: 'matrix'
  dataFile: string           // JSON with { points, durations, distances }
  geojsonFile: string        // commune polygons for highlighting
  geojsonJoinField: string
  pointLabelField: string
  unit: string               // "minutes" | "km"
  thresholds: number[]
  colors: string[]
  legendTitle: string
}

/** Heatmap layer: density visualization */
export interface HeatmapLayer extends LayerBase {
  type: 'heatmap'
  geojsonFile: string        // polygon GeoJSON (communes)
  dataFile: string           // data JSON with values to visualize
  joinField: string          // field in dataFile to match
  geojsonJoinField: string   // field in geojson properties to match
  valueField: string         // field in dataFile used as heat intensity
  radius?: number            // heat point radius (default 25)
  blur?: number              // blur (default 15)
  maxZoom?: number           // max zoom for heat (default 14)
  legendTitle: string
}

export type LayerConfig = ChoroplethLayer | MarkerLayer | GeoJsonLayer | MatrixLayer | HeatmapLayer

/** Per-feature metadata override (user annotations stored separately from OSM data) */
export interface FeatureOverride {
  notes?: string
  verified?: boolean
  [key: string]: unknown
}

/** All overrides: layerId → featureKey → override fields */
export type MetadataOverrides = Record<string, Record<string, FeatureOverride>>

// Type guards
export function isChoropleth(l: LayerConfig): l is ChoroplethLayer {
  return l.type === 'choropleth'
}
export function isMarkers(l: LayerConfig): l is MarkerLayer {
  return l.type === 'markers'
}
export function isGeoJson(l: LayerConfig): l is GeoJsonLayer {
  return l.type === 'geojson'
}
export function isMatrix(l: LayerConfig): l is MatrixLayer {
  return l.type === 'matrix'
}
export function isHeatmap(l: LayerConfig): l is HeatmapLayer {
  return l.type === 'heatmap'
}
