import { useState } from "react";
import { useGetApiPromptTemplates } from "~/api/gen/breakoutDeliberationOSAPI";
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
import {
	Alert,
	Button,
	Checkbox,
	FormField,
	Input,
	Select,
	Stack,
	Typography,
} from "~/components/design-system";

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

// ─── 共通：フェーズ遷移フラグ ────────────────────────────────────────────────
function TransitionFlagsSection({
	flags,
	onChange,
}: {
	flags: Record<string, unknown>;
	onChange: (key: string, value: unknown) => void;
}) {
	return (
		<fieldset className="space-y-3 rounded-lg border px-4 py-3">
			<legend className="text-xs font-medium text-muted-foreground px-1">フェーズ遷移設定</legend>
			<Checkbox
				checked={Boolean(flags.participantCanProposeTransition)}
				onCheckedChange={(checked) => onChange("participantCanProposeTransition", checked)}
				label="参加者が遷移を提案できる"
			/>
			{Boolean(flags.participantCanProposeTransition) && (
				<div className="grid grid-cols-2 gap-3 pl-5">
					<FormField label="投票期間 (秒)">
						<Input
							type="number"
							inputSize="sm"
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
					</FormField>
					<FormField label="可決しきい値 (0〜1)">
						<Input
							type="number"
							inputSize="sm"
							min={0}
							max={1}
							step={0.05}
							value={(flags.transitionThreshold as number) ?? ""}
							onChange={(e) =>
								onChange("transitionThreshold", e.target.value ? Number(e.target.value) : undefined)
							}
							placeholder="0.5"
						/>
					</FormField>
					<FormField label="最低継続時間 (秒)" className="col-span-2">
						<Input
							type="number"
							inputSize="sm"
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
					</FormField>
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
		<Stack direction="vertical" gap={3}>
			<FormField label="動画URL (YouTube)">
				<Input
					value={config.videoUrl ?? ""}
					onChange={(e) => onConfig("videoUrl", e.target.value || undefined)}
					placeholder="https://www.youtube.com/watch?v=..."
				/>
			</FormField>
			<Checkbox
				checked={Boolean(config.autoAdvance)}
				onCheckedChange={(checked) => onConfig("autoAdvance", checked)}
				label="動画終了後に自動で次フェーズへ"
			/>
			<TransitionFlagsSection flags={flags as Record<string, unknown>} onChange={onFlags} />
		</Stack>
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
		<Stack direction="vertical" gap={3}>
			<FormField label="議題">
				<Input
					value={config.topic ?? ""}
					onChange={(e) => onConfig("topic", e.target.value || undefined)}
					placeholder="このフェーズで議論するテーマ"
				/>
			</FormField>

			<fieldset className="space-y-3 rounded-lg border px-4 py-3">
				<legend className="text-xs font-medium text-muted-foreground px-1">発言設定</legend>
				<Checkbox
					checked={Boolean(flags.canSpeak)}
					onCheckedChange={(checked) => onFlags("canSpeak", checked)}
					label="発言キュー機能を有効にする"
				/>
				{flags.canSpeak && (
					<div className="pl-5">
						<FormField label="発言時間 (秒)">
							<Input
								type="number"
								inputSize="sm"
								min={1}
								value={(flags.speakingTimeSec as number) ?? ""}
								onChange={(e) =>
									onFlags("speakingTimeSec", e.target.value ? Number(e.target.value) : undefined)
								}
								placeholder="60"
							/>
						</FormField>
					</div>
				)}
				<Checkbox
					checked={Boolean(flags.canInterrupt)}
					onCheckedChange={(checked) => onFlags("canInterrupt", checked)}
					label="割り込み機能を有効にする"
				/>
				{flags.canInterrupt && (
					<div className="pl-5 grid grid-cols-2 gap-3">
						<FormField label="割り込み時間 (秒)">
							<Input
								type="number"
								inputSize="sm"
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
						</FormField>
						<FormField label="クールダウン (秒)">
							<Input
								type="number"
								inputSize="sm"
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
						</FormField>
						<FormField label="最大同時割り込み数">
							<Input
								type="number"
								inputSize="sm"
								min={1}
								value={(flags.maxInterruptions as number) ?? ""}
								onChange={(e) =>
									onFlags("maxInterruptions", e.target.value ? Number(e.target.value) : undefined)
								}
								placeholder="2"
							/>
						</FormField>
					</div>
				)}
			</fieldset>

			<SummarySettingsSection config={config} onConfig={onConfig} />

			<TransitionFlagsSection flags={flags as Record<string, unknown>} onChange={onFlags} />
		</Stack>
	);
}

// ─── AI要約設定 ────────────────────────────────────────────────────────────────
function SummarySettingsSection({
	config,
	onConfig,
}: {
	config: DiscussionPhaseConfig;
	onConfig: (key: string, value: unknown) => void;
}) {
	const { data: templatesResponse } = useGetApiPromptTemplates();
	const templates = templatesResponse?.data ?? [];

	return (
		<fieldset className="space-y-3 rounded-lg border px-4 py-3">
			<legend className="text-xs font-medium text-muted-foreground px-1">AI要約設定</legend>
			<FormField label="要約モデル">
				<Input
					value={config.summaryModel ?? ""}
					onChange={(e) => onConfig("summaryModel", e.target.value || undefined)}
					placeholder="gpt-4o-mini"
				/>
			</FormField>
			<FormField label="プロンプトテンプレート">
				<Select
					value={config.summaryPromptTemplateId ?? ""}
					onValueChange={(val) => onConfig("summaryPromptTemplateId", val || undefined)}
					options={[
						{ value: "", label: "デフォルト" },
						...templates.map((t) => ({ value: t.id, label: t.name })),
					]}
				/>
			</FormField>
			<Checkbox
				checked={Boolean(config.summaryGraphEnabled)}
				onCheckedChange={(checked) => onConfig("summaryGraphEnabled", checked)}
				label="要約グラフを有効化"
			/>
		</fieldset>
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
		<Stack direction="vertical" gap={3}>
			<FormField label="質問文">
				<Input
					value={config.question ?? ""}
					onChange={(e) => onConfig("question", e.target.value || undefined)}
					placeholder="参加者に問いかける質問"
				/>
			</FormField>
			<Stack direction="vertical" gap={2}>
				<Typography variant="label">選択肢</Typography>
				{options.map((opt, idx) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: ordered list
					<Stack key={idx} direction="horizontal" gap={2}>
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
					</Stack>
				))}
				<Button type="button" variant="outline" size="sm" onClick={addOption}>
					+ 選択肢を追加
				</Button>
			</Stack>
			<Checkbox
				checked={Boolean(flags.canVote)}
				onCheckedChange={(checked) => onFlags("canVote", checked)}
				label="投票を有効にする"
			/>
			<TransitionFlagsSection flags={flags as Record<string, unknown>} onChange={onFlags} />
		</Stack>
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
		<Stack direction="vertical" gap={3}>
			<Stack direction="vertical" gap={2}>
				<Typography variant="label">質問一覧</Typography>
				{questions.map((q, idx) => (
					<div key={q.id} className="rounded-lg border px-3 py-3 space-y-2">
						<Stack direction="horizontal" align="center" justify="between" gap={2}>
							<Typography variant="caption">質問 {idx + 1}</Typography>
							<Button
								type="button"
								variant="ghost"
								size="xs"
								onClick={() => removeQuestion(idx)}
								className="text-destructive hover:text-destructive"
							>
								削除
							</Button>
						</Stack>
						<Input
							value={q.text}
							onChange={(e) => updateQuestion(idx, "text", e.target.value)}
							placeholder="質問文"
						/>
						<Select
							value={q.type}
							onValueChange={(val) => updateQuestion(idx, "type", val)}
							options={[
								{ value: "text", label: "自由記述" },
								{ value: "single_choice", label: "単一選択" },
								{ value: "multiple_choice", label: "複数選択" },
							]}
						/>
					</div>
				))}
				<Button type="button" variant="outline" size="sm" onClick={addQuestion}>
					+ 質問を追加
				</Button>
			</Stack>
			<TransitionFlagsSection flags={flags as Record<string, unknown>} onChange={onFlags} />
		</Stack>
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

	function handleTypeChange(newType: string) {
		setType(newType as PhaseType);
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
			<FormField label="タイプ">
				<Select
					value={type}
					onValueChange={handleTypeChange}
					disabled={!!initial}
					options={[
						{ value: "video", label: "▶ 動画" },
						{ value: "discussion", label: "💬 議論" },
						{ value: "voting", label: "🗳 投票" },
						{ value: "survey", label: "📋 アンケート" },
					]}
				/>
			</FormField>

			{/* タイトル */}
			<FormField label="フェーズ名" required>
				<Input
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="オープニング動画"
					required
				/>
			</FormField>

			{/* タイプ別フィールド */}
			{typeFields[type]}

			{error && <Alert variant="destructive">{error}</Alert>}

			<Stack direction="horizontal" gap={3} className="pt-1">
				<Button type="submit" variant="primary" loading={submitting} disabled={!title}>
					{submitLabel}
				</Button>
				<Button type="button" variant="outline" onClick={onCancel}>
					キャンセル
				</Button>
			</Stack>
		</form>
	);
}
