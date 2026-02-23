/**
 * ReportBuilder — Fluent DSL for building report JSON files.
 *
 * Works in both browser (Vite) and CLI (tsx) contexts.
 * Uses relative imports so both environments can resolve types.
 *
 * Usage:
 *   const report = new ReportBuilder('Mon rapport')
 *     .description('Résumé du rapport')
 *     .h1('Titre principal')
 *     .text('Paragraphe d\'introduction...')
 *     .h2('Section')
 *     .table('fuel-demand.json', { ... })
 *     .barChart('fuel-demand.json', { ... })
 *     .source('JICA/PDTK 2019', { description: '...' })
 *     .sources()
 *     .build()
 */
import type {
  Report,
  ReportBlock,
  ColumnDef,
  ChartDatasetDef,
  SourceItem,
} from '../types/report'

// ── Helpers ────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ── Config interfaces (public API) ─────────────────────────────────

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

// ── Builder ────────────────────────────────────────────────────────

export class ReportBuilder {
  private _title: string
  private _description = ''
  private _slug = ''
  private _id = ''
  private _blocks: ReportBlock[] = []
  private _manualSources: SourceItem[] = []
  private _counter = 0

  constructor(title: string) {
    this._title = title
    this._slug = slugify(title)
    this._id = `rpt_${slugify(title)}`
  }

  private _nextId(): string {
    this._counter++
    return `blk_${this._counter.toString().padStart(3, '0')}`
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
    this._blocks.push({ type: 'title', id: this._nextId(), level: 1, content })
    return this
  }

  /** Add H2 heading */
  h2(content: string): this {
    this._blocks.push({ type: 'title', id: this._nextId(), level: 2, content })
    return this
  }

  /** Add H3 heading */
  h3(content: string): this {
    this._blocks.push({ type: 'title', id: this._nextId(), level: 3, content })
    return this
  }

  /** Add a text paragraph block */
  text(content: string): this {
    this._blocks.push({ type: 'text', id: this._nextId(), content })
    return this
  }

  /** Add a data table block */
  table(dataSource: string, config: TableConfig): this {
    this._blocks.push({
      type: 'table',
      id: this._nextId(),
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

  private _chart(
    chartType: 'bar' | 'line' | 'pie' | 'doughnut',
    dataSource: string,
    config: ChartConfig,
  ): this {
    this._blocks.push({
      type: 'chart',
      id: this._nextId(),
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
    const item: SourceItem = { label, type: 'external' }
    if (config?.url) item.url = config.url
    if (config?.date) item.date = config.date
    if (config?.description) item.description = config.description
    this._manualSources.push(item)
    return this
  }

  /** Add a data-source reference */
  dataSource(label: string, config?: SourceConfig): this {
    const item: SourceItem = { label, type: 'data' }
    if (config?.url) item.url = config.url
    if (config?.date) item.date = config.date
    if (config?.description) item.description = config.description
    this._manualSources.push(item)
    return this
  }

  /** Add the sources block (auto-collects from data blocks + manual sources) */
  sources(title?: string): this {
    this._blocks.push({
      type: 'sources',
      id: this._nextId(),
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
