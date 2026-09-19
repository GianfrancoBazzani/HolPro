CREATE TABLE `calendar_preferences` (
	`user_id` char(36) NOT NULL,
	`row_order` json NOT NULL DEFAULT ('[]'),
	`hidden_engagements` json NOT NULL DEFAULT ('[]'),
	`hidden_kinds` json NOT NULL DEFAULT ('[]'),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `calendar_preferences_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `plan_checkpoints` (
	`id` char(36) NOT NULL,
	`item_id` char(36) NOT NULL,
	`date` date NOT NULL,
	`title` varchar(120) NOT NULL,
	`note` text,
	`status` varchar(12) NOT NULL DEFAULT 'planned',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `plan_checkpoints_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_checkpoints_status_check` CHECK(`plan_checkpoints`.`status` in ('planned', 'done', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE `plan_items` (
	`id` char(36) NOT NULL,
	`engagement_id` char(36) NOT NULL,
	`kind` varchar(24) NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `plan_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_items_kind_check` CHECK(`plan_items`.`kind` in ('training', 'nutrition', 'supplementation', 'mindset', 'habits', 'health', 'other'))
);
--> statement-breakpoint
CREATE TABLE `plan_periods` (
	`id` char(36) NOT NULL,
	`item_id` char(36) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`title` varchar(120) NOT NULL,
	`note` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `plan_periods_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_periods_dates_check` CHECK(`plan_periods`.`end_date` >= `plan_periods`.`start_date`)
);
--> statement-breakpoint
ALTER TABLE `calendar_preferences` ADD CONSTRAINT `calendar_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_checkpoints` ADD CONSTRAINT `plan_checkpoints_item_id_plan_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `plan_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_items` ADD CONSTRAINT `plan_items_engagement_id_engagements_id_fk` FOREIGN KEY (`engagement_id`) REFERENCES `engagements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_periods` ADD CONSTRAINT `plan_periods_item_id_plan_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `plan_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `plan_checkpoints_item_date_idx` ON `plan_checkpoints` (`item_id`,`date`);--> statement-breakpoint
CREATE INDEX `plan_items_engagement_idx` ON `plan_items` (`engagement_id`);--> statement-breakpoint
CREATE INDEX `plan_periods_item_start_idx` ON `plan_periods` (`item_id`,`start_date`);