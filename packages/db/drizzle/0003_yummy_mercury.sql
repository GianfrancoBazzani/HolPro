CREATE TABLE `agenda_events` (
	`id` char(36) NOT NULL,
	`coach_id` char(36) NOT NULL,
	`engagement_id` char(36),
	`kind` varchar(12) NOT NULL DEFAULT 'call',
	`title` varchar(120) NOT NULL,
	`starts_at` datetime(3) NOT NULL,
	`duration_minutes` int NOT NULL DEFAULT 60,
	`note` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `agenda_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `agenda_events_kind_check` CHECK(`agenda_events`.`kind` in ('call', 'event')),
	CONSTRAINT `agenda_events_duration_check` CHECK(`agenda_events`.`duration_minutes` between 5 and 1440)
);
--> statement-breakpoint
ALTER TABLE `agenda_events` ADD CONSTRAINT `agenda_events_coach_id_coaches_user_id_fk` FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`user_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agenda_events` ADD CONSTRAINT `agenda_events_engagement_id_engagements_id_fk` FOREIGN KEY (`engagement_id`) REFERENCES `engagements`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `agenda_events_coach_starts_idx` ON `agenda_events` (`coach_id`,`starts_at`);