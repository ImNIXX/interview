"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  MinusCircle,
  CircleDot,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";

interface Question {
  id: string;
  category: string;
  questionText: string;
  expectedAnswer: string;
  difficulty: string;
  orderIndex: number;
  status: string;
  partialPercent: number | null;
  notes: string | null;
}

interface Interview {
  id: string;
  duration: number;
  status: string;
  totalScore: number | null;
  feedbackSummary: string | null;
  candidate: {
    name: string;
    email: string | null;
    resumeFileName: string;
  };
  questions: Question[];
}

interface Evaluation {
  status: "not_asked" | "correct" | "incorrect" | "partial";
  partialPercent: number;
  notes: string;
}

const categoryColors: Record<string, string> = {
  theoretical: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  logical: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  tricky: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  hands_on: "bg-green-500/10 text-green-400 border-green-500/30",
};

const categoryLabels: Record<string, string> = {
  theoretical: "Theoretical",
  logical: "Logical",
  tricky: "Tricky",
  hands_on: "Hands-on",
};

const difficultyColors: Record<string, string> = {
  easy: "text-green-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
};

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>(
    {},
  );
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchInterview = useCallback(async () => {
    const res = await fetch(`/api/interviews/${id}`);
    const data = await res.json();
    setInterview(data.interview);

    // Initialize evaluations from existing data
    const evals: Record<string, Evaluation> = {};
    for (const q of data.interview.questions) {
      evals[q.id] = {
        status: q.status as Evaluation["status"],
        partialPercent: q.partialPercent || 50,
        notes: q.notes || "",
      };
    }
    setEvaluations(evals);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchInterview();
  }, [fetchInterview]);

  const updateEvaluation = (
    questionId: string,
    field: keyof Evaluation,
    value: string | number,
  ) => {
    setEvaluations((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!interview) return;
    setSubmitting(true);

    try {
      const evaluationData = Object.entries(evaluations).map(
        ([questionId, eval_]) => ({
          questionId,
          status: eval_.status,
          partialPercent: eval_.partialPercent,
          notes: eval_.notes,
        }),
      );

      const res = await fetch(`/api/interviews/${id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluations: evaluationData }),
      });

      if (res.ok) {
        router.push(`/interview/${id}/feedback`);
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!interview) return null;

  // If already completed, redirect to feedback
  if (interview.status === "completed") {
    router.push(`/interview/${id}/feedback`);
    return null;
  }

  const groupedQuestions = {
    theoretical: interview.questions.filter(
      (q) => q.category === "theoretical",
    ),
    logical: interview.questions.filter((q) => q.category === "logical"),
    tricky: interview.questions.filter((q) => q.category === "tricky"),
    hands_on: interview.questions.filter((q) => q.category === "hands_on"),
  };

  const answeredCount = Object.values(evaluations).filter(
    (e) => e.status !== "not_asked",
  ).length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-lg font-semibold text-white hover:text-blue-400 transition"
            >
              ← Dashboard
            </a>
            <span className="text-gray-600">|</span>
            <div>
              <span className="text-white font-medium">
                {interview.candidate.name}
              </span>
              <span className="text-gray-500 ml-2">
                {interview.duration}min interview
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {answeredCount}/{interview.questions.length} evaluated
            </span>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Finish & Evaluate
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Category sections */}
        {(Object.entries(groupedQuestions) as [string, Question[]][]).map(
          ([category, questions]) => (
            <div key={category} className="mb-10">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm border ${categoryColors[category]}`}
                >
                  {categoryLabels[category]}
                </span>
                <span className="text-gray-500 text-sm font-normal">
                  {questions.length} questions
                </span>
              </h2>

              <div className="space-y-3">
                {questions.map((question, qIndex) => {
                  const eval_ = evaluations[question.id];
                  const isExpanded = expandedQuestion === question.id;

                  return (
                    <div
                      key={question.id}
                      className={`border rounded-lg transition ${
                        eval_?.status === "correct"
                          ? "border-green-500/30 bg-green-500/5"
                          : eval_?.status === "incorrect"
                            ? "border-red-500/30 bg-red-500/5"
                            : eval_?.status === "partial"
                              ? "border-yellow-500/30 bg-yellow-500/5"
                              : "border-gray-800 bg-gray-900/50"
                      }`}
                    >
                      {/* Question header */}
                      <div
                        className="px-5 py-4 cursor-pointer flex items-start justify-between gap-4"
                        onClick={() =>
                          setExpandedQuestion(isExpanded ? null : question.id)
                        }
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-500 text-sm font-mono">
                              Q{qIndex + 1}
                            </span>
                            <span
                              className={`text-xs ${difficultyColors[question.difficulty]}`}
                            >
                              {question.difficulty}
                            </span>
                          </div>
                          <p className="text-white">{question.questionText}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {eval_?.status === "correct" && (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          )}
                          {eval_?.status === "incorrect" && (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                          {eval_?.status === "partial" && (
                            <MinusCircle className="w-5 h-5 text-yellow-400" />
                          )}
                          {eval_?.status === "not_asked" && (
                            <CircleDot className="w-5 h-5 text-gray-600" />
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                      </div>

                      {/* Expanded section */}
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-gray-800">
                          {/* Expected answer */}
                          <div className="mt-4 mb-5">
                            <h4 className="text-sm font-medium text-gray-400 mb-2">
                              Expected Answer
                            </h4>
                            <div className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap">
                              {question.expectedAnswer}
                            </div>
                          </div>

                          {/* Evaluation buttons */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {(
                              [
                                {
                                  value: "correct",
                                  label: "Correct",
                                  icon: CheckCircle,
                                  color: "green",
                                },
                                {
                                  value: "partial",
                                  label: "Partial",
                                  icon: MinusCircle,
                                  color: "yellow",
                                },
                                {
                                  value: "incorrect",
                                  label: "Incorrect",
                                  icon: XCircle,
                                  color: "red",
                                },
                                {
                                  value: "not_asked",
                                  label: "Not Asked",
                                  icon: CircleDot,
                                  color: "gray",
                                },
                              ] as const
                            ).map(({ value, label, icon: Icon, color }) => (
                              <button
                                key={value}
                                onClick={() =>
                                  updateEvaluation(question.id, "status", value)
                                }
                                className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition text-sm ${
                                  eval_?.status === value
                                    ? `border-${color}-500 bg-${color}-500/20 text-${color}-400`
                                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                                }`}
                                style={
                                  eval_?.status === value
                                    ? {
                                        borderColor: `var(--color-${color})`,
                                        backgroundColor: `color-mix(in srgb, var(--color-${color}) 20%, transparent)`,
                                      }
                                    : undefined
                                }
                              >
                                <Icon className="w-4 h-4" />
                                {label}
                              </button>
                            ))}
                          </div>

                          {/* Partial percentage slider */}
                          {eval_?.status === "partial" && (
                            <div className="mb-4">
                              <label className="text-sm text-gray-400 mb-2 block">
                                How close was the answer?{" "}
                                <span className="text-yellow-400 font-medium">
                                  {eval_.partialPercent}%
                                </span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={eval_.partialPercent}
                                onChange={(e) =>
                                  updateEvaluation(
                                    question.id,
                                    "partialPercent",
                                    parseInt(e.target.value),
                                  )
                                }
                                className="w-full accent-yellow-500"
                              />
                              <div className="flex justify-between text-xs text-gray-600 mt-1">
                                <span>0%</span>
                                <span>25%</span>
                                <span>50%</span>
                                <span>75%</span>
                                <span>100%</span>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          <div>
                            <label className="text-sm text-gray-400 mb-2 block">
                              Notes (optional)
                            </label>
                            <textarea
                              value={eval_?.notes || ""}
                              onChange={(e) =>
                                updateEvaluation(
                                  question.id,
                                  "notes",
                                  e.target.value,
                                )
                              }
                              rows={2}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                              placeholder="Any observations about the candidate's answer..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ),
        )}

        {/* Bottom submit */}
        <div className="sticky bottom-0 bg-gray-950/90 backdrop-blur border-t border-gray-800 -mx-6 px-6 py-4 flex items-center justify-between">
          <p className="text-gray-400">
            {answeredCount} of {interview.questions.length} questions evaluated
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Feedback...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Finish & Generate Feedback
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
