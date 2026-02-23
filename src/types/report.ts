// =============================================
// Report types — block-based dynamic reports
// =============================================

/** A value that can be a plain string or a bilingual { fr, en } object */
export type Localizable = string | { fr: string; en: string }

/** Title block: H1/H2/H3 heading */
export interface TitleBlock {
  type: 'title'
  id: string
  level: 1 | 2 | 3
  content: Localizable
}

/** Text block: free-text paragraph (plain text or simple HTML) */
export interface TextBlock {
  type: 'text'
  id: string
  content: Localizable
}

/** Column definition for table blocks */
export interface ColumnDef {
  field: string
  label: Localizable
  format?: 'number' | 'percent' | 'text'
  decimals?: number
}

/** Table block: data table sourced from a data file or with inline data */
export interface TableBlock {
  type: 'table'
  id: string
  title?: Localizable
  dataSource: string       // filename in public/data/ (e.g. 'fuel-demand.json') or 'inline' for embedded data
  columns: ColumnDef[]
  sortBy?: string           // field to sort by
  sortDir?: 'asc' | 'desc'
  limit?: number            // max rows
  filters?: Record<string, unknown> // field → value filter
  inlineData?: Record<string, unknown>[] // embedded rows (used for matrix tables)
}

/** Chart block: Chart.js visualization */
export interface ChartBlock {
  type: 'chart'
  id: string
  title?: Localizable
  chartType: 'bar' | 'pie' | 'line' | 'doughnut'
  dataSource: string        // filename or 'computed:xxx' for computed datasets
  labelField: string        // field for x-axis / labels
  datasets: ChartDatasetDef[]
  options?: Record<string, unknown>
}

export interface ChartDatasetDef {
  field: string              // data field for values
  label: Localizable         // legend label
  color?: string             // bar/line color
  backgroundColor?: string | string[]
}

/** Source reference for automatic or manual citation */
export interface SourceItem {
  label: Localizable         // display name (e.g. "JICA/PDTK 2019")
  url?: string               // optional URL
  date?: string              // access/publication date
  description?: Localizable  // short description
  type: 'data' | 'external'  // auto-collected from data vs manually added
}

/** Sources block: lists data sources and manual references */
export interface SourcesBlock {
  type: 'sources'
  id: string
  title?: Localizable        // heading, defaults to "Sources"
  autoCollect: boolean       // auto-scan other blocks for dataSource metadata
  items: SourceItem[]        // manually added or script-provided sources
}

export type ReportBlock = TitleBlock | TextBlock | TableBlock | ChartBlock | SourcesBlock

/** Full report document */
export interface Report {
  id: string
  title: Localizable
  slug: string
  description: Localizable
  blocks: ReportBlock[]
  createdAt: string          // ISO date
  updatedAt: string          // ISO date
}
