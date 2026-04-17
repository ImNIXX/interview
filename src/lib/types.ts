export interface GeneratedQuestion {
  category: "theoretical" | "logical" | "tricky" | "hands_on";
  questionText: string;
  expectedAnswer: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface QuestionEvaluation {
  questionId: string;
  status: "not_asked" | "correct" | "incorrect" | "partial";
  partialPercent?: number;
  notes?: string;
}
