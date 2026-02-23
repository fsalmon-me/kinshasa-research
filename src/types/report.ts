// =============================================
// Report types — block-based dynamic reports
// =============================================

/** Title block: H1/H2/H3 heading */
export interface TitleBlock {
  type: 'title'
  id: string
  level: 1 | 2 | 3
  content: string
}

/** Text block: free-text paragraph (plain text or simple HTML) */
export interface TextBlock {
  type: 'text'
  id: string
  content: string
}

/** Column definition for table blocks */
export interface ColumnDef {
  field: string
  label: string
  format?: 'number' | 'percent' | 'text'
  decimals?: number
}

/** Table block: data table sourced from a data file */
export interface TableBlock {
  type: 'table'
  id: string
  title?: string
  dataSource: string       // filename in public/data/ (e.g. 'fuel-demand.json')
  columns: ColumnDef[]
  sortBy?: string           // field to sort by
  sortDir?: 'asc' | 'desc'
  limit?: number            // max rows
  filters?: Record<string, unknown> // field → value filter
}

/** Chart block: Chart.js visualization */
export interface ChartBlock {
  type: 'chart'
  id: string
  title?: string
  chartType: 'bar' | 'pie' | 'line' | 'doughnut'
  dataSource: string        // filename or 'computed:xxx' for computed datasets
  labelField: string        // field for x-axis / labels
  datasets: ChartDatasetDef[]
  options?: Record<string, unknown>
}

export interface ChartDatasetDef {
  field: string              // data field for values
  label: string              // legend label
  color?: string             // bar/line color
  backgroundColor?: string | string[]
}

export type ReportBlock = TitleBlock | TextBlock | TableBlock | ChartBlock

/** Full report document */
export interface Report {
  id: string
  title: string
  slug: string
  description: string
  blocks: ReportBlock[]
  createdAt: string          // ISO date
  updatedAt: string          // ISO date
}
