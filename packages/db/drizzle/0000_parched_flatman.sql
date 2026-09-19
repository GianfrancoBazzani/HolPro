CREATE TABLE `accounts` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` datetime(3),
	`refresh_token_expires_at` datetime(3),
	`scope` text,
	`password` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` char(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`count` int NOT NULL,
	`last_request` bigint NOT NULL,
	CONSTRAINT `rate_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `rate_limits_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image_url` text,
	`timezone` varchar(64) NOT NULL DEFAULT 'UTC',
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`email_verified_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_status_check` CHECK(`users`.`status` in ('pending', 'active', 'suspended'))
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` char(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coach_specialties` (
	`coach_id` char(36) NOT NULL,
	`specialty` varchar(64) NOT NULL,
	CONSTRAINT `coach_specialties_coach_id_specialty_pk` PRIMARY KEY(`coach_id`,`specialty`)
);
--> statement-breakpoint
CREATE TABLE `coachees` (
	`user_id` char(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `coachees_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `coaches` (
	`user_id` char(36) NOT NULL,
	`bio` text,
	`accepting_clients` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `coaches_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `engagements` (
	`id` char(36) NOT NULL,
	`coach_id` char(36) NOT NULL,
	`coachee_id` char(36) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`ended_at` datetime(3),
	CONSTRAINT `engagements_id` PRIMARY KEY(`id`),
	CONSTRAINT `engagements_status_check` CHECK(`engagements`.`status` in ('active', 'ended'))
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coach_specialties` ADD CONSTRAINT `coach_specialties_coach_id_coaches_user_id_fk` FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`user_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coachees` ADD CONSTRAINT `coachees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coaches` ADD CONSTRAINT `coaches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `engagements` ADD CONSTRAINT `engagements_coach_id_coaches_user_id_fk` FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`user_id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `engagements` ADD CONSTRAINT `engagements_coachee_id_coachees_user_id_fk` FOREIGN KEY (`coachee_id`) REFERENCES `coachees`(`user_id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `engagements_coach_status_idx` ON `engagements` (`coach_id`,`status`);--> statement-breakpoint
CREATE INDEX `engagements_coachee_status_idx` ON `engagements` (`coachee_id`,`status`);