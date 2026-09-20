CREATE TABLE `plan_document_drafts` (
	`id` char(36) NOT NULL,
	`document_id` char(36) NOT NULL,
	`title` varchar(160),
	`html` mediumtext NOT NULL,
	`submitted_by` char(36) NOT NULL,
	`submitted_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `plan_document_drafts_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_document_drafts_document_uidx` UNIQUE(`document_id`)
);
--> statement-breakpoint
ALTER TABLE `plan_document_drafts` ADD CONSTRAINT `plan_document_drafts_document_id_plan_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `plan_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_document_drafts` ADD CONSTRAINT `plan_document_drafts_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;