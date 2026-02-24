import { useState } from "react";
import type { Phase } from "~/api/models";
import type { DiscussionPhaseConfig } from "~/api/models/discussionPhaseConfig";
import type { DiscussionPhaseFeatureFlags } from "~/api/models/discussionPhaseFeatureFlags";
import type { PhaseType } from "~/api/models/phaseType";
import type { SurveyPhaseConfig } from "~/api/models/surveyPhaseConfig";
import type { SurveyPhaseFeatureFlags } from "~/api/models/surveyPhaseFeatureFlags";
import type { VideoPhaseConfig } from "~/api/models/videoPhaseConfig";
import type { VideoPhaseFeatureFlags } from "~/api/models/videoPhaseFeatureFlags";
import type { VotingPhaseConfig } from "~/api/models/votingPhaseConfig";
import type { VotingPhaseFeatureFlags } from "~/api/models/votingPhaseFeatureFlags";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export type PhaseFormValues = {
	type: PhaseType;
	title: string;
	config: Record<string, unknown>;
	featureFlags: Record<string, unknown>;
};

type Props = {
	initial?: Phase;
	onSubmit: (values: PhaseFormValues) => Promise<void>;
	onCancel: () => void;
	submitLabel?: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
	return <p className="text-xs text-muted-foreground mb-1">{children}</p>;
}

// ─── 共通：フェーズ遷移フラグ ────────────────────────────────────────────────
function TransitionFlagsSection({
	flags,
	onChange,
}: {
	flags: Record<string, unknown>;
	onChange: (key: string, value: unknown) => void;
}) {
	return (
		<fieldset className="space-y-2 rounded-md border px-4 py-3">
			<legend className="text-xs font-medium text-muted-foreground px-1">フェーズ遷移設定</legend>
			<label className="flex items-center gap-2 text-sm cursor-pointer">
				<input
					type="checkbox"
					checked={Boolean(flags.participantCanProposeTransition)}
					onChange={(e) => onChange("participantCanProposeTransition", e.target.checked)}
				/>
				参加者が遷移を提案できる
			</label>
			{Boolean(flags.participantCanProposeTransition) && (
				<div className="grid grid-cols-2 gap-3 pl-5">
					<div>
						<FieldLabel>投票期間 (秒)</FieldLabel>
						<Input
							type="number"
							min={1}
							value={(flags.transitionVoteDurationSec as number) ?? ""}
							onChange={(e) =>
								onChange(
									"transitionVoteDurationSec",
									e.target.value ? Number(e.target.value) : undefined,
								)
							}
							placeholder="60"
						/>
					</div>
					<div>
						<FieldLabel>可決しきい値 (0〜1)</FieldLabel>
						<Input
							type="number"
							min={0}
							max={1}
							step={0.05}
							value={(flags.transitionThreshold as number) ?? ""}
							onChange={(e) =>
								onChange("transitionThreshold", e.target.value ? Number(e.target.value) : undefined)
							}
							placeholder="0.5"
						/>
					</div>
					<div className="col-span-2">
						<FieldLabel>最低継続時間 (秒)</FieldLabel>
						<Input
							type="number"
							min={0}
							value={(flags.transitionMinDurationSec as number) ?? ""}
							onChange={(e) =>
								onChange(
									"transitionMinDurationSec",
									e.target.value ? Number(e.target.value) : undefined,
								)
							}
							placeholder="0"
						/>
					</div>
				</div>
			)}
		</fieldset>
	);
}

// ─── Video ────────────────────────────────────────────────────────────────────
function VideoFields({
	config,
	flags,
	onConfig,
	onFlags,
}: {
	config: VideoPhaseConfig;
	flags: VideoPhaseFeatureFlags;
	onConfig: (key: string, value: unknown) => void;
	onFlags: (key: string, value: unknown) => void;
}) {
	return (
		<div className="space-y-3">
			<div>
				<FieldLabel>動画URL (YouTube)</FieldLabel>
				<Input
					value={config.videoUrl ?? ""}
					onChange={(e) => onConfig("videoUrl", e.target.value || undefined)}
					placeholder="https://www.youtube.com/watch?v=..."
				/>
			</div>
			<label className="flex items-center gap-2 text-sm cursor-pointer">
				<input
					type="checkbox"
					checked={Boolean(config.autoAdvance)}
					onChange={(e) => onConfig("autoAdvance", e.target.checked)}
				/>
				動画終了後に自動で次フェーズへ
			</label>
			<TransitionFlagsSection flags={flags as Record<string, unknown>} onChange={onFlags} />
		</div>
	);
}

// ─── Discussion ───────────────────────────────────────────────────────────────
function DiscussionFields({
	config,
	flags,
	onConfig,
	onFlags,
}: {
	config: DiscussionPhaseConfig;
	flags: DiscussionPhaseFeatureFlags;
	onConfig: (key: string, value: unknown) => void;
	onFlags: (key: string, value: unknown) => void;
}) {
	return (
		<div className="space-y-3">
			<div>
				<FieldLabel>議題</FieldLabel>
				<Input
					value={config.topic ?? ""}
					onChange={(e) => onConfig("topic", e.target.value || undefined)}
					placeholder="このフェーズで議論するテーマ"
				/>
			</div>

			<fieldset className="space-y-2 rounded-md border px-4 py-3">
				<legend className="text-xs font-medium text-muted-foreground px-1">発言設定</legend>
				<label className="flex items-center gap-2 text-sm cursor-pointer">
					<input
						type="checkbox"
						checked={Boolean(flags.canSpeak)}
						onChange={(e) => onFlags("canSpeak", e.target.checked)}
					/>
					発言キュー機能を有効にする
				</label>
				{flags.canSpeak && (
					<div className="pl-5">
						<FieldLabel>発言時間 (秒)</FieldLabel>
						<Input
							type="number"
							min={1}
							value={(flags.speakingTimeSec as number) ?? ""}
							onChange={(e) =>
								onFlags("speakingTimeSec", e.target.value ? Number(e.target.value) : undefined)
							}
							placeholder="60"
						/>
					</div>
				)}
				<label className="flex items-center gap-2 text-sm cursor-pointer">
					<input
						type="checkbox"
						checked={Boolean(flags.canInterrupt)}
						onChange={(e) => onFlags("canInterrupt", e.target.checked)}
					/>
					割り込み機能を有効にする
				</label>
				{flags.canInterrupt && (
					<div className="pl-5 grid grid-cols-2 gap-2">
						<div>
							<FieldLabel>割り込み時間 (秒)</FieldLabel>
							<Input
								type="number"
								min={1}
								value={(flags.interruptionTimeSec as number) ?? ""}
								onChange={(e) =>
									onFlags(
										"interruptionTimeSec",
										e.target.value ? Number(e.target.value) : undefined,
									)
								}
								placeholder="15"
							/>
						</div>
						<div>
							<FieldLabel>クールダウン (秒)</FieldLabel>
							<Input
								type="number"
								min={0}
								value={(flags.interruptionCooldownSec as number) ?? ""}
								onChange={(e) =>
									onFlags(
										"interruptionCooldownSec",
										e.target.value ? Number(e.target.value) : undefined,
									)
								}
								placeholder="30"
							/>
						</div>
						<div>
							<FieldLabel>最大同時割り込み数</FieldLabel>
							<Input
								type="number"
								min={1}
								value={(flags.maxInterruptions as number) ?? ""}
								onChange={(e) =>
									onFlags("maxInterruptions", e.target.value ? Number(e.target.value) : undefined)
								}
								placeholder="2"
							/>
						</div>
					</div>
				)}
			</fieldset>

			<TransitionFlagsSection flags={flags as Record<string, unknown>} onChange={onFlags} />
		</div>
	);
}

// ─── Voting ───────────────────────────────────────────────────────────────────
function VotingFields({
	config,
	flags,
	onConfig,
	onFlags,
}: {
	config: VotingPhaseConfig;
	flags: VotingPhaseFeatureFlags;
	onConfig: (key: string, value: unknown) => void;
	onFlags: (key: string, value: unknown) => void;
}) {
	const options = (config.options ?? []) as string[];

	function updateOption(idx: number, val: string) {
		const next = [...options];
		next[idx] = val;
		onConfig("options", next);
	}

	function addOption() {
		onConfig("options", [...options, ""]);
	}

	function removeOption(idx: number) {
		onConfig(
			"options",
			options.filter((_, i) => i !== idx),
		);
	}

	return (
		<div className="space-y-3">
			<div>
				<FieldLabel>質問文</FieldLabel>
				<Input
					value={config.question ?? ""}
					onChange={(e) => onConfig("question", e.target.value || undefined)}
					placeholder="参加者に問いかける質問"
				/>
			</div>
			<div className="space-y-2">
				<p className="text-sm font-medium">選択肢</p>
				{options.map((opt, idx) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: ordered list
					<div key={idx} className="flex gap-2">
						<Input
							value={opt}
							onChange={(e) => updateOption(idx, e.target.value)}
							placeholder={`選択肢 ${idx + 1}`}
						/>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => removeOption(idx)}
							className="text-destructive hover:text-destructive shrink-0"
						>
							×
						</Button>
					</div>
				))}
				<Button type="button" variant="outline" size="sm" onClick={addOption}>
					+ 選択肢を追加
				</Button>
			</div>
			<label className="flex items-center gap-2 text-sm cursor-pointer">
				<input
					type="checkbox"
					checked={Boolean(flags.canVote)}
					onChange={(e) => onFlags("canVote", e.target.checked)}
				/>
				投票を有効にする
			</label>
			<TransitionFlagsSection flags={flags as Record<string, unknown>} onChange={onFlags} />
		</div>
	);
}

// ─── Survey ───────────────────────────────────────────────────────────────────
function SurveyFields({
	config,
	flags,
	onConfig,
	onFlags,
}: {
	config: SurveyPhaseConfig;
	flags: SurveyPhaseFeatureFlags;
	onConfig: (key: string, value: unknown) => void;
	onFlags: (key: string, value: unknown) => void;
}) {
	const questions = (config.questions ?? []) as Array<{
		id: string;
		text: string;
		type: "text" | "single_choice" | "multiple_choice";
	}>;

	function addQuestion() {
		onConfig("questions", [...questions, { id: crypto.randomUUID(), text: "", type: "text" }]);
	}

	function updateQuestion(idx: number, key: string, val: unknown) {
		const next = questions.map((q, i) => (i === idx ? { ...q, [key]: val } : q));
		onConfig("questions", next);
	}

	function removeQuestion(idx: number) {
		onConfig(
			"questions",
			questions.filter((_, i) => i !== idx),
		);
	}

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				<p className="text-sm font-medium">質問一覧</p>
				{questions.map((q, idx) => (
					<div key={q.id} className="rounded-md border px-3 py-3 space-y-2">
						<div className="flex items-center justify-between gap-2">
							<span className="text-xs text-muted-foreground">質問 {idx + 1}</span>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => removeQuestion(idx)}
								className="text-destructive hover:text-destructive h-6 text-xs"
							>
								削除
							</Button>
						</div>
						<Input
							value={q.text}
							onChange={(e) => updateQuestion(idx, "text", e.target.value)}
							placeholder="質問文"
						/>
						<select
							value={q.type}
							onChange={(e) => updateQuestion(idx, "type", e.target.value)}
							className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
						>
							<option value="text">自由記述</option>
							<option value="single_choice">単一選択</option>
							<option value="multiple_choice">複数選択</option>
						</select>
					</div>
				))}
				<Button type="button" variant="outline" size="sm" onClick={addQuestion}>
					+ 質問を追加
				</Button>
			</div>
			<TransitionFlagsSection flags={flags as Record<string, unknown>} onChange={onFlags} />
		</div>
	);
}

// ─── メインフォーム ────────────────────────────────────────────────────────────
function initConfig(phase?: Phase): Record<string, unknown> {
	if (!phase) return {};
	return { ...(phase.config as Record<string, unknown>) };
}

function initFlags(phase?: Phase): Record<string, unknown> {
	if (!phase) return {};
	return { ...(phase.featureFlags as Record<string, unknown>) };
}

export function PhaseForm({ initial, onSubmit, onCancel, submitLabel = "保存" }: Props) {
	const [type, setType] = useState<PhaseType>(initial?.type ?? "discussion");
	const [title, setTitle] = useState(initial?.title ?? "");
	const [config, setConfig] = useState<Record<string, unknown>>(initConfig(initial));
	const [flags, setFlags] = useState<Record<string, unknown>>(initFlags(initial));
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function onConfig(key: string, value: unknown) {
		setConfig((prev) => ({ ...prev, [key]: value }));
	}

	function onFlags(key: string, value: unknown) {
		setFlags((prev) => ({ ...prev, [key]: value }));
	}

	function handleTypeChange(newType: PhaseType) {
		setType(newType);
		setConfig({});
		setFlags({});
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await onSubmit({ type, title, config, featureFlags: flags });
		} catch {
			setError("保存に失敗しました");
		} finally {
			setSubmitting(false);
		}
	}

	const typeFields = {
		video: (
			<VideoFields
				config={config as VideoPhaseConfig}
				flags={flags as VideoPhaseFeatureFlags}
				onConfig={onConfig}
				onFlags={onFlags}
			/>
		),
		discussion: (
			<DiscussionFields
				config={config as DiscussionPhaseConfig}
				flags={flags as DiscussionPhaseFeatureFlags}
				onConfig={onConfig}
				onFlags={onFlags}
			/>
		),
		voting: (
			<VotingFields
				config={config as VotingPhaseConfig}
				flags={flags as VotingPhaseFeatureFlags}
				onConfig={onConfig}
				onFlags={onFlags}
			/>
		),
		survey: (
			<SurveyFields
				config={config as SurveyPhaseConfig}
				flags={flags as SurveyPhaseFeatureFlags}
				onConfig={onConfig}
				onFlags={onFlags}
			/>
		),
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* タイプ選択（編集時は変更不可） */}
			<div>
				<FieldLabel>タイプ</FieldLabel>
				<select
					value={type}
					onChange={(e) => handleTypeChange(e.target.value as PhaseType)}
					disabled={!!initial}
					className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring disabled:opacity-50"
				>
					<option value="video">▶ 動画</option>
					<option value="discussion">💬 議論</option>
					<option value="voting">🗳 投票</option>
					<option value="survey">📋 アンケート</option>
				</select>
			</div>

			{/* タイトル */}
			<div>
				<FieldLabel>
					フェーズ名 <span className="text-destructive">*</span>
				</FieldLabel>
				<Input
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="オープニング動画"
					required
				/>
			</div>

			{/* タイプ別フィールド */}
			{typeFields[type]}

			{error && <p className="text-sm text-destructive">{error}</p>}

			<div className="flex gap-3 pt-1">
				<Button type="submit" disabled={submitting || !title}>
					{submitting ? "保存中..." : submitLabel}
				</Button>
				<Button type="button" variant="outline" onClick={onCancel}>
					キャンセル
				</Button>
			</div>
		</form>
	);
}
