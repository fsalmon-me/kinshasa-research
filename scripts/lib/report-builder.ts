/**
 * ReportBuilder — Fluent DSL for building report JSON files.
 *
 * Usage:
 *   const report = new ReportBuilder('Mon rapport')
 *     .description('Résumé du rapport')
 *     .h1('Titre principal')
 *     .text('Paragraph d\'introduction...')
 *     .h2('Section')
 *     .table('fuel-demand.json', { ... })
 *     .barChart('fuel-demand.json', { ... })
 *     .source('JICA/PDTK 2019', { description: '...' })
 *     .sources()
 *     .build()
 */

// Mirror types from src/types/report.ts (script-side, no Vue dependency)
interface ColumnDef {
  field: string
  label: string
  format?: 'number' | 'percent' | 'text'
  decimals?: number
}

interface ChartDatasetDef {
  field: string
  label: string
  color?: string
  backgroundColor?: string | string[]
}

interface SourceItem {
  label: string
  url?: string
  date?: string
  description?: string
  type: 'data' | 'external'
}

type ReportBlock =
  | { type: 'title'; id: string; level: 1 | 2 | 3; content: string }
  | { type: 'text'; id: string; content: string }
  | { type: 'table'; id: string; title?: string; dataSource: string; columns: ColumnDef[]; sortBy?: string; sortDir?: 'asc' | 'desc'; limit?: number; filters?: Record<string, unknown> }
  | { type: 'chart'; id: string; title?: string; chartType: 'bar' | 'pie' | 'line' | 'doughnut'; dataSource: string; labelField: string; datasets: ChartDatasetDef[]; options?: Record<string, unknown> }
  | { type: 'sources'; id: string; title?: string; autoCollect: boolean; items: SourceItem[] }

interface Report {
  id: string
  title: string
  slug: string
  description: string
  blocks: ReportBlock[]
  createdAt: string
  updatedAt: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

let blockCounter = 0
function nextId(): string {
  blockCounter++
  return `blk_${blockCounter.toString().padStart(3, '0')}`
}

export interface TableConfig {
  title?: string
  columns: ColumnDef[]
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  limit?: number
  filters?: Record<string, unknown>
}

export interface ChartConfig {
  title?: string
  labelField: string
  datasets: ChartDatasetDef[]
  options?: Record<string, unknown>
}

export interface SourceConfig {
  url?: string
  date?: string
  description?: string
}

export class ReportBuilder {
  private _title: string
  private _description = ''
  private _slug = ''
  private _id = ''
  private _blocks: ReportBlock[] = []
  private _manualSources: SourceItem[] = []

  constructor(title: string) {
    this._title = title
    this._slug = slugify(title)
    this._id = `rpt_${slugify(title)}`
    blockCounter = 0
  }

  /** Set report description */
  description(desc: string): this {
    this._description = desc
    return this
  }

  /** Override auto-generated slug */
  slug(s: string): this {
    this._slug = s
    return this
  }

  /** Override auto-generated id */
  id(id: string): this {
    this._id = id
    return this
  }

  /** Add H1 heading */
  h1(content: string): this {
    this._blocks.push({ type: 'title', id: nextId(), level: 1, content })
    return this
  }

  /** Add H2 heading */
  h2(content: string): this {
    this._blocks.push({ type: 'title', id: nextId(), level: 2, content })
    return this
  }

  /** Add H3 heading */
  h3(content: string): this {
    this._blocks.push({ type: 'title', id: nextId(), level: 3, content })
    return this
  }

  /** Add a text paragraph block */
  text(content: string): this {
    this._blocks.push({ type: 'text', id: nextId(), content })
    return this
  }

  /** Add a data table block */
  table(dataSource: string, config: TableConfig): this {
    this._blocks.push({
      type: 'table',
      id: nextId(),
      title: config.title,
      dataSource,
      columns: config.columns,
      sortBy: config.sortBy,
      sortDir: config.sortDir,
      limit: config.limit,
      filters: config.filters,
    })
    return this
  }

  /** Add a bar chart block */
  barChart(dataSource: string, config: ChartConfig): this {
    return this._chart('bar', dataSource, config)
  }

  /** Add a line chart block */
  lineChart(dataSource: string, config: ChartConfig): this {
    return this._chart('line', dataSource, config)
  }

  /** Add a pie chart block */
  pieChart(dataSource: string, config: ChartConfig): this {
    return this._chart('pie', dataSource, config)
  }

  /** Add a doughnut chart block */
  doughnutChart(dataSource: string, config: ChartConfig): this {
    return this._chart('doughnut', dataSource, config)
  }

  private _chart(chartType: 'bar' | 'line' | 'pie' | 'doughnut', dataSource: string, config: ChartConfig): this {
    this._blocks.push({
      type: 'chart',
      id: nextId(),
      title: config.title,
      chartType,
      dataSource,
      labelField: config.labelField,
      datasets: config.datasets,
      options: config.options,
    })
    return this
  }

  /** Add a manual external source */
  source(label: string, config?: SourceConfig): this {
    this._manualSources.push({
      label,
      url: config?.url,
      date: config?.date,
      description: config?.description,
      type: 'external',
    })
    return this
  }

  /** Add a data-source reference (auto-collected from layers.json at render time) */
  dataSource(label: string, config?: SourceConfig): this {
    this._manualSources.push({
      label,
      url: config?.url,
      date: config?.date,
      description: config?.description,
      type: 'data',
    })
    return this
  }

  /** Add the sources block (auto-collects from data blocks + manual sources) */
  sources(title?: string): this {
    this._blocks.push({
      type: 'sources',
      id: nextId(),
      title: title ?? 'Sources & Références',
      autoCollect: true,
      items: [...this._manualSources],
    })
    return this
  }

  /** Build the final Report JSON object */
  build(): Report {
    const now = new Date().toISOString()
    return {
      id: this._id,
      title: this._title,
      slug: this._slug,
      description: this._description,
      blocks: this._blocks,
      createdAt: now,
      updatedAt: now,
    }
  }
}
