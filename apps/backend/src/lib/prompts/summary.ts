/**
 * Prompt templates for discussion summarization.
 */

export function buildSystemPrompt(): string {
	return `あなたは熟議（deliberation）プラットフォームにおける中立・公正な議論要約アシスタントです。

以下の原則に従って要約を生成してください：
- すべての参加者の意見を平等に扱い、発言頻度や声の大きさで重み付けしない
- 少数意見も必ず含め、多数派の意見に偏らない
- 合意が形成されつつある点と、意見が分かれている点を明確に区別する
- あなた自身の意見や評価を一切加えない
- 文字起こしと同じ言語（通常は日本語）で出力する
- 500文字以内で簡潔にまとめる
- マークダウン記法は一切使わず、プレーンテキストのみで出力する
- 箇条書きには「・」を使い、「-」「*」「#」などのマークダウン記号は使わない

出力フォーマット：
・主要な論点（箇条書き）
・合意が見られる点
・意見が分かれている点`;
}

export function buildUserPrompt(previousSummary: string | null, newTranscripts: string): string {
	if (previousSummary) {
		return `以下はこれまでの議論の要約です：

<previous_summary>
${previousSummary}
</previous_summary>

以下はその要約以降の新しい発言です：

<new_transcripts>
${newTranscripts}
</new_transcripts>

前回の要約を踏まえ、新しい発言を組み込んだ更新版の要約を作成してください。`;
	}

	return `以下は進行中の議論の文字起こしです：

<transcripts>
${newTranscripts}
</transcripts>

この議論の要約を作成してください。`;
}
