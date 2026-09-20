CREATE TABLE `coachee_goals` (
	`coachee_id` char(36) NOT NULL,
	`goals` text NOT NULL,
	`summary` varchar(280) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `coachee_goals_coachee_id` PRIMARY KEY(`coachee_id`)
);
--> statement-breakpoint
ALTER TABLE `coachee_goals` ADD CONSTRAINT `coachee_goals_coachee_id_coachees_user_id_fk` FOREIGN KEY (`coachee_id`) REFERENCES `coachees`(`user_id`) ON DELETE cascade ON UPDATE no action;