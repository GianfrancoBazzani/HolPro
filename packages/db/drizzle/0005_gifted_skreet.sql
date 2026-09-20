CREATE TABLE `plan_document_versions` (
	`id` char(36) NOT NULL,
	`document_id` char(36) NOT NULL,
	`number` int NOT NULL,
	`html` mediumtext NOT NULL,
	`published_by` char(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `plan_document_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_document_versions_document_number_uidx` UNIQUE(`document_id`,`number`),
	CONSTRAINT `plan_document_versions_number_check` CHECK(`plan_document_versions`.`number` > 0)
);
--> statement-breakpoint
CREATE TABLE `plan_documents` (
	`id` char(36) NOT NULL,
	`engagement_id` char(36) NOT NULL,
	`title` varchar(160) NOT NULL,
	`current_version_id` char(36),
	`created_by` char(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `plan_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `plan_document_versions` ADD CONSTRAINT `plan_document_versions_document_id_plan_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `plan_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_document_versions` ADD CONSTRAINT `plan_document_versions_published_by_users_id_fk` FOREIGN KEY (`published_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_documents` ADD CONSTRAINT `plan_documents_engagement_id_engagements_id_fk` FOREIGN KEY (`engagement_id`) REFERENCES `engagements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_documents` ADD CONSTRAINT `plan_documents_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `plan_documents_engagement_idx` ON `plan_documents` (`engagement_id`);