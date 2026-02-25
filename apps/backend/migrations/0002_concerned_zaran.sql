CREATE TABLE `discussion_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`phase_id` text NOT NULL,
	`content` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`transcript_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phase_id`) REFERENCES `phases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discussion_summaries_room_phase_uniq` ON `discussion_summaries` (`room_id`,`phase_id`);