CREATE TABLE `coach_skills` (
	`id` char(36) NOT NULL,
	`coach_id` char(36) NOT NULL,
	`name` varchar(64) NOT NULL,
	`description` varchar(1024) NOT NULL,
	`instructions` text NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `coach_skills_id` PRIMARY KEY(`id`),
	CONSTRAINT `coach_skills_coach_name_idx` UNIQUE(`coach_id`,`name`)
);
--> statement-breakpoint
ALTER TABLE `coach_skills` ADD CONSTRAINT `coach_skills_coach_id_coaches_user_id_fk` FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`user_id`) ON DELETE cascade ON UPDATE no action;