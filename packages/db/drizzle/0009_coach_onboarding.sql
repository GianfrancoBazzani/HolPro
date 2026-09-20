CREATE TABLE `notifications` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`request_id` char(36) NOT NULL,
	`kind` varchar(24) NOT NULL,
	`href` varchar(512) NOT NULL,
	`read_at` datetime(3),
	`delivered_at` datetime(3),
	`attempts` int NOT NULL DEFAULT 0,
	`next_attempt_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`lease_token` char(36),
	`lease_until` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_request_kind_uidx` UNIQUE(`request_id`,`kind`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_requests` (
	`id` char(36) NOT NULL,
	`coach_id` char(36) NOT NULL,
	`coachee_id` char(36) NOT NULL,
	`engagement_id` char(36) NOT NULL,
	`plan_id` char(36),
	`goals` text NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'requested',
	`attempts` int NOT NULL DEFAULT 0,
	`lease_token` char(36),
	`lease_until` datetime(3),
	`next_attempt_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`error_code` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `onboarding_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `onboarding_pair_uidx` UNIQUE(`coachee_id`,`coach_id`),
	CONSTRAINT `onboarding_status_check` CHECK(`onboarding_requests`.`status` in ('requested','preparing','awaiting_review','approved','rejected','failed'))
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`endpoint` text NOT NULL,
	`endpoint_hash` char(64) NOT NULL,
	`p256dh` varchar(128) NOT NULL,
	`auth` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_endpoint_uidx` UNIQUE(`endpoint_hash`)
);
--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_request_id_onboarding_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `onboarding_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_requests` ADD CONSTRAINT `onboarding_requests_coach_id_coaches_user_id_fk` FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`user_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_requests` ADD CONSTRAINT `onboarding_requests_coachee_id_coachees_user_id_fk` FOREIGN KEY (`coachee_id`) REFERENCES `coachees`(`user_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_requests` ADD CONSTRAINT `onboarding_requests_engagement_id_engagements_id_fk` FOREIGN KEY (`engagement_id`) REFERENCES `engagements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_requests` ADD CONSTRAINT `onboarding_requests_plan_id_plan_documents_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plan_documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_queue_idx` ON `notifications` (`delivered_at`,`next_attempt_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `onboarding_queue_idx` ON `onboarding_requests` (`status`,`next_attempt_at`,`lease_until`);--> statement-breakpoint
CREATE INDEX `onboarding_coach_idx` ON `onboarding_requests` (`coach_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `push_user_idx` ON `push_subscriptions` (`user_id`);