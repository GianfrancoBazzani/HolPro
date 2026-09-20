CREATE TABLE `telegram_links` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`role` varchar(8) NOT NULL,
	`telegram_user_id` bigint,
	`telegram_chat_id` bigint,
	`telegram_username` varchar(64),
	`token_hash` char(64),
	`token_expires_at` datetime(3),
	`linked_at` datetime(3),
	`revoked_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `telegram_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_links_user_uidx` UNIQUE(`user_id`),
	CONSTRAINT `telegram_links_telegram_user_uidx` UNIQUE(`telegram_user_id`),
	CONSTRAINT `telegram_links_token_uidx` UNIQUE(`token_hash`),
	CONSTRAINT `telegram_links_role_check` CHECK(`telegram_links`.`role` in ('coach', 'coachee')),
	CONSTRAINT `telegram_links_state_check` CHECK((
    (`telegram_links`.`telegram_user_id` is null and `telegram_links`.`telegram_chat_id` is null and `telegram_links`.`telegram_username` is null and `telegram_links`.`linked_at` is null and `telegram_links`.`token_hash` is not null and `telegram_links`.`token_expires_at` is not null)
    or (`telegram_links`.`telegram_user_id` is not null and `telegram_links`.`telegram_chat_id` is not null and `telegram_links`.`linked_at` is not null and `telegram_links`.`token_hash` is null and `telegram_links`.`token_expires_at` is null)
  ))
);
--> statement-breakpoint
ALTER TABLE `telegram_links` ADD CONSTRAINT `telegram_links_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;