import { integer, sqliteTable, text, index, real } from 'drizzle-orm/sqlite-core'

export const canvases = sqliteTable('canvases', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  viewportX: real('viewport_x').default(0).notNull(),
  viewportY: real('viewport_y').default(0).notNull(),
  viewportZoom: real('viewport_zoom').default(1).notNull(),
  snapToGrid: integer('snap_to_grid', { mode: 'boolean' }).default(true).notNull(),
  gridSize: integer('grid_size').default(20).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
})

export type Canvas = typeof canvases.$inferSelect
export type NewCanvas = typeof canvases.$inferInsert

export const workflows = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  canvasId: text('canvas_id').notNull().references(() => canvases.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  positionX: real('position_x').default(0).notNull(),
  positionY: real('position_y').default(0).notNull(),
  color: text('color'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (t) => [
  index('idx_workflows_canvas').on(t.canvasId),
])

export type Workflow = typeof workflows.$inferSelect
export type NewWorkflow = typeof workflows.$inferInsert

export const workflowNodes = sqliteTable('workflow_nodes', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  nodeTypeId: text('node_type_id').notNull(),
  label: text('label').notNull(),
  positionX: real('position_x').default(0).notNull(),
  positionY: real('position_y').default(0).notNull(),
  width: real('width'),
  height: real('height'),
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (t) => [
  index('idx_nodes_workflow').on(t.workflowId),
  index('idx_nodes_type').on(t.nodeTypeId),
])

export type WorkflowNode = typeof workflowNodes.$inferSelect
export type NewWorkflowNode = typeof workflowNodes.$inferInsert

export const edges = sqliteTable('edges', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  sourceNodeId: text('source_node_id').notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  sourcePortId: text('source_port_id').notNull(),
  targetNodeId: text('target_node_id').notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  targetPortId: text('target_port_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (t) => [
  index('idx_edges_workflow').on(t.workflowId),
  index('idx_edges_source').on(t.sourceNodeId),
  index('idx_edges_target').on(t.targetNodeId),
])

export type Edge = typeof edges.$inferSelect
export type NewEdge = typeof edges.$inferInsert

export const nodeTypes = sqliteTable('node_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  source: text('source').notNull(),
  filePath: text('file_path'),
  dslDefinition: text('dsl_definition', { mode: 'json' }),
  icon: text('icon'),
  color: text('color'),
  defaultConfig: text('default_config', { mode: 'json' }).$type<Record<string, unknown>>(),
  portsDefinition: text('ports_definition', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
})

export type NodeType = typeof nodeTypes.$inferSelect
export type NewNodeType = typeof nodeTypes.$inferInsert

export const executionHistory = sqliteTable('execution_history', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'running', 'success', 'error', 'cancelled'] }).notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  durationMs: integer('duration_ms'),
  triggerType: text('trigger_type', { enum: ['manual', 'agent', 'schedule'] }).notNull(),
  nodeResults: text('node_results', { mode: 'json' }).$type<Record<string, unknown>>(),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (t) => [
  index('idx_execution_workflow').on(t.workflowId),
  index('idx_execution_status').on(t.status),
])

export type ExecutionHistory = typeof executionHistory.$inferSelect
export type NewExecutionHistory = typeof executionHistory.$inferInsert
