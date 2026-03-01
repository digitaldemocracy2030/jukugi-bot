import { useLocalParticipant } from "@livekit/components-react";
import { useState } from "react";
import {
	useGetApiRoomsRoomIdPhases,
	useGetApiRoomsRoomIdPhasesPhaseIdSurveyResponsesSummary,
	usePostApiRoomsRoomIdPhasesPhaseIdSurveyResponses,
} from "../../../../src/api/gen/breakoutDeliberationOSAPI";
import type { SurveyPhaseConfig } from "../../../../src/api/models/surveyPhaseConfig";
import type { SurveyPhaseConfigQuestionsItem } from "../../../../src/api/models/surveyPhaseConfigQuestionsItem";
import type { RoomMetadata } from "../../../types/room-metadata";
import {
	Alert,
	Badge,
	Button,
	Divider,
	FormField,
	Progress,
	RadioGroup,
	Stack,
	Textarea,
	Typography,
} from "../../design-system";
import { ProposeTransitionButton } from "../transition/propose-transition-button";
import { TransitionVotePanel } from "../transition/transition-vote-panel";

type SurveyPhaseProps = {
	metadata: RoomMetadata | null;
	roomId: string;
};

type SurveyAnswers = Record<string, string | number>;

function ScaleInput({
	value,
	onChange,
}: {
	value: number | undefined;
	onChange: (val: number) => void;
}) {
	const scaleOptions = [1, 2, 3, 4, 5].map((n) => ({
		value: String(n),
		label: String(n),
	}));

	return (
		<Stack direction="vertical" gap={1}>
			<RadioGroup
				options={scaleOptions}
				value={value !== undefined ? String(value) : undefined}
				onValueChange={(v) => onChange(Number(v))}
				orientation="horizontal"
			/>
			<Stack direction="horizontal" justify="between">
				<Typography variant="body-sm" color="muted">
					低い
				</Typography>
				<Typography variant="body-sm" color="muted">
					高い
				</Typography>
			</Stack>
		</Stack>
	);
}

function QuestionRenderer({
	question,
	value,
	onChange,
}: {
	question: SurveyPhaseConfigQuestionsItem;
	value: string | number | undefined;
	onChange: (val: string | number) => void;
}) {
	if (question.type === "text") {
		return (
			<Textarea
				value={typeof value === "string" ? value : ""}
				onChange={(e) => onChange(e.target.value)}
				placeholder="回答を入力してください"
				minRows={3}
				autoResize
			/>
		);
	}

	if (question.type === "scale") {
		return <ScaleInput value={typeof value === "number" ? value : undefined} onChange={onChange} />;
	}

	if (question.type === "choice" && question.options) {
		return (
			<RadioGroup
				options={question.options.map((opt) => ({
					value: opt,
					label: opt,
				}))}
				value={typeof value === "string" ? value : undefined}
				onValueChange={onChange}
				orientation="vertical"
			/>
		);
	}

	return (
		<Typography variant="body-sm" color="muted">
			未対応の質問タイプです
		</Typography>
	);
}

export function SurveyPhase({ metadata, roomId }: SurveyPhaseProps) {
	const { localParticipant } = useLocalParticipant();

	const participantMeta = (() => {
		try {
			return localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {};
		} catch {
			return {};
		}
	})();
	const isFacilitator = participantMeta.role === "facilitator";

	const currentPhaseId = metadata?.currentPhaseId ?? null;

	// Fetch phase config
	const { data: phasesData } = useGetApiRoomsRoomIdPhases(roomId, {
		query: { staleTime: 30_000 },
	});
	const phases = phasesData?.status === 200 ? phasesData.data : [];
	const currentPhase = phases.find((p) => p.id === currentPhaseId);
	const config = (
		currentPhase?.type === "survey" ? currentPhase.config : null
	) as SurveyPhaseConfig | null;

	const questions = config?.questions ?? [];

	// Local form state
	const [answers, setAnswers] = useState<SurveyAnswers>({});
	const [hasSubmitted, setHasSubmitted] = useState(false);

	// Submit mutation
	const submitMutation = usePostApiRoomsRoomIdPhasesPhaseIdSurveyResponses();

	// Fetch summary (after submit, with polling)
	const { data: summaryData } = useGetApiRoomsRoomIdPhasesPhaseIdSurveyResponsesSummary(
		roomId,
		currentPhaseId ?? "",
		{
			query: {
				enabled: hasSubmitted && !!currentPhaseId,
				refetchInterval: 3000,
				staleTime: 2000,
			},
		},
	);
	const summary = summaryData?.status === 200 ? summaryData.data : null;

	const answeredCount = questions.filter((q) => {
		const val = answers[q.id];
		if (val === undefined || val === "") return false;
		return true;
	}).length;

	const allAnswered = questions.length > 0 && answeredCount === questions.length;

	const handleAnswerChange = (questionId: string, value: string | number) => {
		setAnswers((prev) => ({ ...prev, [questionId]: value }));
	};

	const handleSubmit = () => {
		if (!currentPhaseId || !allAnswered) return;

		const formattedAnswers = questions.map((q) => ({
			questionId: q.id,
			value: answers[q.id],
		}));

		submitMutation.mutate(
			{
				roomId,
				phaseId: currentPhaseId,
				data: { answers: formattedAnswers },
			},
			{
				onSuccess: () => {
					setHasSubmitted(true);
				},
				onError: (error: unknown) => {
					const status = (error as { response?: { status?: number } })?.response?.status;
					if (status === 409) {
						setHasSubmitted(true);
					}
				},
			},
		);
	};

	return (
		<div className="flex flex-col h-full overflow-y-auto">
			{/* Header */}
			<div className="px-4 py-3">
				<Stack direction="horizontal" gap={2} align="center">
					<Badge variant="solid" colorScheme="info">
						アンケート
					</Badge>
					<Typography variant="h4">{currentPhase?.title ?? "アンケートフェーズ"}</Typography>
				</Stack>
			</div>

			<Divider />

			{/* Form or completion */}
			<div className="px-4 py-4 flex-1">
				{questions.length === 0 ? (
					<Typography variant="body" color="muted" align="center">
						質問が設定されていません
					</Typography>
				) : !hasSubmitted ? (
					<Stack direction="vertical" gap={5}>
						{/* Progress */}
						<Stack direction="vertical" gap={1}>
							<Stack direction="horizontal" justify="between">
								<Typography variant="body-sm" color="muted">
									進捗: {answeredCount} / {questions.length} 問
								</Typography>
								<Typography variant="body-sm" color="muted">
									{questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0}%
								</Typography>
							</Stack>
							<Progress value={answeredCount} max={questions.length} size="sm" variant="default" />
						</Stack>

						{/* Questions */}
						{questions.map((question, index) => (
							<FormField key={question.id} label={`Q${index + 1}. ${question.text}`}>
								<QuestionRenderer
									question={question}
									value={answers[question.id]}
									onChange={(val) => handleAnswerChange(question.id, val)}
								/>
							</FormField>
						))}

						{/* Submit */}
						<Button
							variant="primary"
							size="lg"
							fullWidth
							disabled={!allAnswered}
							loading={submitMutation.isPending}
							onClick={handleSubmit}
						>
							送信する
						</Button>
					</Stack>
				) : (
					<Stack direction="vertical" gap={4} align="center">
						<Alert variant="success">ご回答ありがとうございます。</Alert>

						{summary && (
							<Typography variant="body" color="muted">
								回答済み: {summary.totalResponses} 名
							</Typography>
						)}
					</Stack>
				)}
			</div>

			{/* Phase transition */}
			<Divider />
			<div className="px-4 py-3">
				{metadata?.transitionProposal ? (
					<TransitionVotePanel
						roomId={roomId}
						proposal={metadata.transitionProposal}
						isAdmin={isFacilitator}
					/>
				) : (
					<ProposeTransitionButton roomId={roomId} isAdmin={isFacilitator} disabled={false} />
				)}
			</div>
		</div>
	);
}
