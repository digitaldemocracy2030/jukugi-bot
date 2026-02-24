CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`recovery_code` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participants_recovery_code_unique` ON `participants` (`recovery_code`);--> statement-breakpoint
CREATE TABLE `phase_activations` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`phase_id` text NOT NULL,
	`started_by` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phase_id`) REFERENCES `phases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `phase_transition_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`from_phase_id` text NOT NULL,
	`to_phase_id` text,
	`proposed_by` text NOT NULL,
	`proposed_by_role` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`required_threshold` real DEFAULT 0.5 NOT NULL,
	`expires_at` integer,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_phase_id`) REFERENCES `phases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `phase_transition_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`choice` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`proposal_id`) REFERENCES `phase_transition_proposals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phase_transition_votes_proposal_participant_uniq` ON `phase_transition_votes` (`proposal_id`,`participant_id`);--> statement-breakpoint
CREATE TABLE `phases` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`config` text DEFAULT '{}',
	`feature_flags` text DEFAULT '{}',
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recordings` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`egress_id` text NOT NULL,
	`status` text DEFAULT 'recording' NOT NULL,
	`storage_key` text,
	`storage_url` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_sec` integer,
	`file_size` integer,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recordings_egress_id_unique` ON `recordings` (`egress_id`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`max_participants` integer DEFAULT 10 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_slug_unique` ON `rooms` (`slug`);--> statement-breakpoint
CREATE TABLE `session_participations` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`room_id` text NOT NULL,
	`role` text DEFAULT 'participant' NOT NULL,
	`joined_at` integer NOT NULL,
	`left_at` integer,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `speaking_log` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`phase_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`type` text DEFAULT 'normal' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_sec` integer,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phase_id`) REFERENCES `phases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `session_participations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`participant_id` text,
	`phase_id` text,
	`content` text NOT NULL,
	`language` text DEFAULT 'ja' NOT NULL,
	`confidence` real,
	`is_final` integer DEFAULT false NOT NULL,
	`start_offset_ms` integer,
	`end_offset_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `session_participations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`phase_id`) REFERENCES `phases`(`id`) ON UPDATE no action ON DELETE set null
);
