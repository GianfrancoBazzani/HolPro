CREATE TABLE `plan_change_drafts` (
	`id` char(36) NOT NULL,
	`engagement_id` char(36) NOT NULL,
	`operations` json NOT NULL,
	`submitted_by` char(36) NOT NULL,
	`submitted_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `plan_change_drafts_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_change_drafts_engagement_uidx` UNIQUE(`engagement_id`)
);
--> statement-breakpoint
ALTER TABLE `plan_change_drafts` ADD CONSTRAINT `plan_change_drafts_engagement_id_engagements_id_fk` FOREIGN KEY (`engagement_id`) REFERENCES `engagements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_change_drafts` ADD CONSTRAINT `plan_change_drafts_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;