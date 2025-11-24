type CommentSeverity = 'info' | 'warning' | 'error';

type LLMComment = {
  line: number;
  severity: CommentSeverity;
  message: string;
};

export type LLMReviewResult = {
  comments: LLMComment[];
};

export type LLMProvider = {
  reviewCode(prompt: string): Promise<LLMReviewResult>;
};
