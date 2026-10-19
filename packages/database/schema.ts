/**
 * Aspirational database schema — not connected to the running application.
 * The app currently uses in-memory storage (see src/services/storage.ts).
 * To enable persistence: install drizzle-orm, set up PostgreSQL, and wire
 * this schema to a database client.
 *
 * Install: npm install drizzle-orm pg
 *
 * Replex PostgreSQL Schema Definition (Drizzle ORM)
 * Corresponds to Section 9: Data Model
 */

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  varchar,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

// 1. Source Providers
export const sourceProviders = pgTable('source_providers', {
  id: varchar('id', { length: 32 }).primaryKey(), // 'github', 'npm', etc.
  name: varchar('name', { length: 64 }).notNull(),
  apiBaseUrl: text('api_base_url').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  rateLimitPerHour: integer('rate_limit_per_hour').default(5000),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Repository Owners
export const repositoryOwners = pgTable('repository_owners', {
  id: text('id').primaryKey(), // 'owner_login'
  login: varchar('login', { length: 128 }).notNull(),
  avatarUrl: text('avatar_url'),
  htmlUrl: text('html_url').notNull(),
  type: varchar('type', { length: 32 }).default('User'), // 'User' | 'Organization'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Categories Taxonomy
export const categories = pgTable('categories', {
  id: varchar('id', { length: 64 }).primaryKey(), // 'Design & UI', etc.
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description').notNull(),
  iconName: varchar('icon_name', { length: 64 }).notNull(),
  subcategories: jsonb('subcategories').$type<string[]>().default([]).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Repositories
export const repositories = pgTable(
  'repositories',
  {
    id: text('id').primaryKey(), // 'owner/repo'
    name: varchar('name', { length: 128 }).notNull(),
    fullName: varchar('full_name', { length: 256 }).notNull(),
    ownerId: text('owner_id').references(() => repositoryOwners.id).notNull(),
    sourceProviderId: varchar('source_provider_id', { length: 32 })
      .references(() => sourceProviders.id)
      .default('github')
      .notNull(),
    htmlUrl: text('html_url').notNull(),
    description: text('description').default(''),
    homepageUrl: text('homepage_url'),
    primaryLanguage: varchar('primary_language', { length: 64 }),
    stars: integer('stars').default(0).notNull(),
    forks: integer('forks').default(0).notNull(),
    openIssues: integer('open_issues').default(0).notNull(),
    licenseKey: varchar('license_key', { length: 64 }),
    licenseName: text('license_name'),
    licenseSpdxId: varchar('license_spdx_id', { length: 64 }),
    isArchived: boolean('is_archived').default(false).notNull(),
    isTemplate: boolean('is_template').default(false).notNull(),
    visibility: varchar('visibility', { length: 16 }).default('public').notNull(),
    readmeExtract: text('readme_extract'),
    installCommand: text('install_command'),

    // Distinct Timestamps (Do not collapse into single updated_at)
    upstreamCreatedAt: timestamp('upstream_created_at', { withTimezone: true }).notNull(),
    upstreamPushedAt: timestamp('upstream_pushed_at', { withTimezone: true }).notNull(),
    upstreamUpdatedAt: timestamp('upstream_updated_at', { withTimezone: true }).notNull(),
    lastReplexFetchAt: timestamp('last_replex_fetch_at', { withTimezone: true }).defaultNow().notNull(),
    lastReplexClassifiedAt: timestamp('last_replex_classified_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index('idx_repositories_name').on(table.name),
    starsIdx: index('idx_repositories_stars').on(table.stars),
    langIdx: index('idx_repositories_language').on(table.primaryLanguage),
    pushedIdx: index('idx_repositories_pushed_at').on(table.upstreamPushedAt),
  })
);

// 5. Repository Topics
export const repositoryTopics = pgTable(
  'repository_topics',
  {
    repositoryId: text('repository_id').references(() => repositories.id, { onDelete: 'cascade' }).notNull(),
    topic: varchar('topic', { length: 64 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.repositoryId, table.topic] }),
    topicIdx: index('idx_repo_topics_topic').on(table.topic),
  })
);

// 6. Repository Classification & Purpose
export const repositoryCategories = pgTable(
  'repository_categories',
  {
    repositoryId: text('repository_id').references(() => repositories.id, { onDelete: 'cascade' }).notNull(),
    categoryId: varchar('category_id', { length: 64 }).references(() => categories.id).notNull(),
    subcategories: jsonb('subcategories').$type<string[]>().default([]).notNull(),
    functionalPurpose: text('functional_purpose').notNull(),
    intendedAudience: text('intended_audience').notNull(),
    implementationApproach: text('implementation_approach').notNull(),
    supportedEnvironments: jsonb('supported_environments').$type<string[]>().default([]).notNull(),
    evidenceConfidence: integer('evidence_confidence').default(100).notNull(), // 0 to 100
  },
  (table) => ({
    pk: primaryKey({ columns: [table.repositoryId, table.categoryId] }),
  })
);

// 7. Stack Evidence
export const repositoryStackEvidence = pgTable('repository_stack_evidence', {
  repositoryId: text('repository_id').primaryKey().references(() => repositories.id, { onDelete: 'cascade' }),
  frameworks: jsonb('frameworks').$type<string[]>().default([]).notNull(),
  buildTools: jsonb('build_tools').$type<string[]>().default([]).notNull(),
  packageManagers: jsonb('package_managers').$type<string[]>().default([]).notNull(),
  runtimes: jsonb('runtimes').$type<string[]>().default([]).notNull(),
  keyDependencies: jsonb('key_dependencies').$type<string[]>().default([]).notNull(),
  configFilesDetected: jsonb('config_files_detected').$type<string[]>().default([]).notNull(),
});

// 8. Repository Relationships Graph
export const repositoryRelationships = pgTable(
  'repository_relationships',
  {
    sourceRepositoryId: text('source_repo_id').references(() => repositories.id, { onDelete: 'cascade' }).notNull(),
    targetRepositoryId: text('target_repo_id').references(() => repositories.id, { onDelete: 'cascade' }).notNull(),
    relationshipType: varchar('relationship_type', { length: 64 }).notNull(),
    evidence: text('evidence').notNull(),
    confidence: integer('confidence').default(100).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sourceRepositoryId, table.targetRepositoryId, table.relationshipType] }),
  })
);

// 9. Collections & Items
export const collections = pgTable('collections', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description').default(''),
  isPrivate: boolean('is_private').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const collectionItems = pgTable(
  'collection_items',
  {
    collectionId: varchar('collection_id', { length: 64 }).references(() => collections.id, { onDelete: 'cascade' }).notNull(),
    repositoryId: text('repository_id').references(() => repositories.id, { onDelete: 'cascade' }).notNull(),
    notes: text('notes').default(''),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.collectionId, table.repositoryId] }),
  })
);

// 10. Watchlists & Notifications
export const watchlists = pgTable('watchlists', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  targetType: varchar('target_type', { length: 32 }).notNull(), // 'repository' | 'category' | 'ecosystem'
  targetValue: text('target_value').notNull(),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 64 }).primaryKey(),
  watchlistId: varchar('watchlist_id', { length: 64 }).references(() => watchlists.id, { onDelete: 'cascade' }).notNull(),
  repositoryId: text('repository_id').references(() => repositories.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

// 11. API Keys & Metering
export const apiKeys = pgTable('api_keys', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  prefix: varchar('prefix', { length: 32 }).notNull(),
  hashedSecret: varchar('hashed_secret', { length: 128 }).notNull(),
  rateLimitTier: varchar('rate_limit_tier', { length: 32 }).default('developer').notNull(),
  allowedScopes: jsonb('allowed_scopes').$type<string[]>().default([]).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
