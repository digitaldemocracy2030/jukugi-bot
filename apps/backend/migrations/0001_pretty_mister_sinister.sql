CREATE TABLE `survey_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`phase_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`answers` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phase_id`) REFERENCES `phases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `survey_responses_phase_participant_uniq` ON `survey_responses` (`phase_id`,`participant_id`);--> statement-breakpoint
CREATE TABLE `voting_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`phase_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`selected_option` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phase_id`) REFERENCES `phases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `voting_answers_phase_participant_uniq` ON `voting_answers` (`phase_id`,`participant_id`);