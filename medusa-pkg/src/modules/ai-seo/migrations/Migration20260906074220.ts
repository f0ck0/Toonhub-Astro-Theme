import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260906074220 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "ai_article" ("id" text not null, "title" text not null, "slug" text not null, "locale" text not null default 'en', "summary" text null, "content" text null, "seo_title" text null, "seo_description" text null, "seo_keywords" text null, "keywords" jsonb null, "status" text not null default 'draft', "published_at" timestamptz null, "scheduled_at" timestamptz null, "seo_score" integer null, "quality_status" text null, "optimization_status" text null, "optimization_notes" text null, "optimization_attempts" integer not null default 0, "last_optimized_at" timestamptz null, "source_product_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_article_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_article_deleted_at" ON "ai_article" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ai_article_slug_locale" ON "ai_article" ("slug", "locale") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_article_status" ON "ai_article" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_audit_log" ("id" text not null, "action" text not null, "resource_type" text null, "resource_id" text null, "admin_email" text null, "message" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_audit_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_audit_log_deleted_at" ON "ai_audit_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_content_score" ("id" text not null, "article_id" text null, "seo_score" integer null, "readability_score" integer null, "keyword_score" integer null, "originality_score" integer null, "product_relevance_score" integer null, "ai_risk_score" integer null, "overall_score" integer null, "status" text null, "notes" text null, "checks" jsonb null, "recommendations" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_content_score_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_content_score_deleted_at" ON "ai_content_score" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_content_score_status" ON "ai_content_score" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_content_score_article" ON "ai_content_score" ("article_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_google_push_log" ("id" text not null, "article_id" text null, "url" text null, "push_type" text null, "status" text null, "message" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_google_push_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_google_push_log_deleted_at" ON "ai_google_push_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_internal_link_rule" ("id" text not null, "anchor_text" text not null, "target_url" text not null, "target_type" text null, "target_id" text null, "source_type" text not null default 'manual', "locale" text not null default 'en', "priority" integer not null default 50, "max_insertions" integer not null default 1, "usage_count" integer not null default 0, "last_used_at" timestamptz null, "enabled" boolean not null default true, "auto_generated" boolean not null default false, "notes" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_internal_link_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_internal_link_rule_deleted_at" ON "ai_internal_link_rule" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_internal_link_rule_enabled" ON "ai_internal_link_rule" ("enabled") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_internal_link_usage" ("id" text not null, "rule_id" text null, "article_id" text null, "anchor_text" text null, "target_url" text null, "locale" text null, "insertions_count" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_internal_link_usage_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_internal_link_usage_deleted_at" ON "ai_internal_link_usage" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_optimization_log" ("id" text not null, "article_id" text null, "content_score_id" text null, "status" text null, "before_score" integer not null default 0, "after_score" integer not null default 0, "attempt" integer not null default 0, "notes" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_optimization_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_optimization_log_deleted_at" ON "ai_optimization_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_prompt_template" ("id" text not null, "name" text not null, "template_type" text not null, "locale" text not null default 'en', "system_prompt" text null, "user_prompt" text null, "enabled" boolean not null default true, "position" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_prompt_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_prompt_template_deleted_at" ON "ai_prompt_template" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_provider" ("id" text not null, "name" text not null, "provider_type" text not null, "base_url" text null, "default_model" text null, "encrypted_api_key" text null, "models_cache" jsonb null, "enabled" boolean not null default true, "last_test_status" text null, "last_test_message" text null, "last_tested_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_provider_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_provider_deleted_at" ON "ai_provider" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_task" ("id" text not null, "task_type" text not null, "status" text not null default 'queued', "payload" jsonb null, "result" text null, "error_message" text null, "model" text null, "attempts" integer not null default 0, "max_attempts" integer not null default 3, "started_at" timestamptz null, "finished_at" timestamptz null, "scheduled_at" timestamptz null, "article_id" text null, "provider_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_task_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_task_deleted_at" ON "ai_task" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_task_status" ON "ai_task" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_task_type" ON "ai_task" ("task_type") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_usage_event" ("id" text not null, "provider_id" text null, "task_id" text null, "operation" text null, "model" text null, "prompt_tokens" integer not null default 0, "completion_tokens" integer not null default 0, "total_tokens" integer not null default 0, "estimated_cost" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_usage_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_usage_event_deleted_at" ON "ai_usage_event" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "api_integration" ("id" text not null, "name" text not null, "base_url" text null, "encrypted_token" text null, "encrypted_external_api_token" text null, "enabled" boolean not null default true, "last_test_status" text null, "last_test_message" text null, "last_tested_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "api_integration_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_api_integration_deleted_at" ON "api_integration" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_factory_config" ("id" text not null, "name" text not null default 'default', "provider_id" text null, "model" text null, "max_rounds" integer not null default 3, "round_interval_minutes" integer not null default 15, "articles_per_round" integer not null default 2, "keywords_per_round" integer not null default 30, "publish_mode" text not null default 'draft', "locale" text not null default 'en', "stop_after_hours" integer not null default 0, "include_optimization" boolean not null default true, "include_internal_links" boolean not null default true, "product_focus" boolean not null default true, "enabled" boolean not null default true, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_factory_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_factory_config_deleted_at" ON "content_factory_config" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "seo_keyword" ("id" text not null, "keyword" text not null, "keyword_type" text not null default 'primary', "locale" text not null default 'en', "priority" integer not null default 0, "status" text not null default 'new', "source" text null, "article_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seo_keyword_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seo_keyword_deleted_at" ON "seo_keyword" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seo_keyword_keyword_locale" ON "seo_keyword" ("keyword", "locale") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ai_article" cascade;`);

    this.addSql(`drop table if exists "ai_audit_log" cascade;`);

    this.addSql(`drop table if exists "ai_content_score" cascade;`);

    this.addSql(`drop table if exists "ai_google_push_log" cascade;`);

    this.addSql(`drop table if exists "ai_internal_link_rule" cascade;`);

    this.addSql(`drop table if exists "ai_internal_link_usage" cascade;`);

    this.addSql(`drop table if exists "ai_optimization_log" cascade;`);

    this.addSql(`drop table if exists "ai_prompt_template" cascade;`);

    this.addSql(`drop table if exists "ai_provider" cascade;`);

    this.addSql(`drop table if exists "ai_task" cascade;`);

    this.addSql(`drop table if exists "ai_usage_event" cascade;`);

    this.addSql(`drop table if exists "api_integration" cascade;`);

    this.addSql(`drop table if exists "content_factory_config" cascade;`);

    this.addSql(`drop table if exists "seo_keyword" cascade;`);
  }

}
