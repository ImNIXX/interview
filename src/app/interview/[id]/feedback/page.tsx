"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  XCircle,
  MinusCircle,
  CircleDot,
  BarChart3,
  User,
  Clock,
  FileText,
} from "lucide-react";

interface Question {
  id: string;
  category: string;
  questionText: string;
  expectedAnswer: string;
  difficulty: string;
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
  completedAt: string | null;
  createdAt: string;
  candidate: {
    name: string;
    email: string | null;
    resumeFileName: string;
  };
  questions: Question[];
}

const categoryLabels: Record<string, string> = {
  theoretical: "Theoretical",
  logical: "Logical",
  tricky: "Tricky",
  hands_on: "Hands-on",
};

export default function FeedbackPage() {
  const params = useParams();
  const id = params.id as string;
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInterview = useCallback(async () => {
    const res = await fetch(`/api/interviews/${id}`);
    const data = await res.json();
    setInterview(data.interview);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchInterview();
  }, [fetchInterview]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!interview) return null;

  const questions = interview.questions;
  const asked = questions.filter((q) => q.status !== "not_asked");
  const correct = questions.filter((q) => q.status === "correct");
  const incorrect = questions.filter((q) => q.status === "incorrect");
  const partial = questions.filter((q) => q.status === "partial");
  const notAsked = questions.filter((q) => q.status === "not_asked");

  const scoreColor =
    (interview.totalScore || 0) >= 70
      ? "text-green-400"
      : (interview.totalScore || 0) >= 40
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <a
            href="/"
            className="text-lg font-semibold text-white hover:text-blue-400 transition"
          >
            ← Dashboard
          </a>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">Interview Feedback</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Candidate Info Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {interview.candidate.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {interview.candidate.name}
                </h1>
                {interview.candidate.email && (
                  <p className="text-sm text-gray-400">
                    {interview.candidate.email}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-6 text-sm text-gray-400 ml-auto">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {interview.duration}min
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {interview.candidate.resumeFileName}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {new Date(interview.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 md:col-span-1 flex flex-col items-center justify-center">
            <BarChart3 className="w-6 h-6 text-gray-500 mb-2" />
            <span className={`text-4xl font-bold ${scoreColor}`}>
              {(interview.totalScore || 0).toFixed(0)}%
            </span>
            <span className="text-sm text-gray-500 mt-1">Overall Score</span>
          </div>

          <StatCard
            label="Correct"
            count={correct.length}
            total={asked.length}
            icon={<CheckCircle className="w-5 h-5 text-green-400" />}
            color="green"
          />
          <StatCard
            label="Partial"
            count={partial.length}
            total={asked.length}
            icon={<MinusCircle className="w-5 h-5 text-yellow-400" />}
            color="yellow"
          />
          <StatCard
            label="Incorrect"
            count={incorrect.length}
            total={asked.length}
            icon={<XCircle className="w-5 h-5 text-red-400" />}
            color="red"
          />
          <StatCard
            label="Not Asked"
            count={notAsked.length}
            total={questions.length}
            icon={<CircleDot className="w-5 h-5 text-gray-500" />}
            color="gray"
          />
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(["theoretical", "logical", "tricky", "hands_on"] as const).map(
            (cat) => {
              const catQuestions = asked.filter((q) => q.category === cat);
              const catCorrect = catQuestions.filter(
                (q) => q.status === "correct",
              ).length;
              const catPartial = catQuestions.filter(
                (q) => q.status === "partial",
              );
              const partialScore = catPartial.reduce(
                (s, q) => s + (q.partialPercent || 0),
                0,
              );
              const catScore =
                catQuestions.length > 0
                  ? ((catCorrect * 100 + partialScore) /
                      (catQuestions.length * 100)) *
                    100
                  : 0;

              return (
                <div
                  key={cat}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4"
                >
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    {categoryLabels[cat]}
                  </h3>
                  <p className="text-2xl font-bold text-white">
                    {catScore.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {catCorrect}/{catQuestions.length} correct
                  </p>
                </div>
              );
            },
          )}
        </div>

        {/* AI Feedback */}
        {interview.feedbackSummary && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              AI-Generated Feedback
            </h2>
            <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed">
              {interview.feedbackSummary}
            </div>
          </div>
        )}

        {/* Detailed Question Results */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Question-by-Question Results
          </h2>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={`border rounded-lg p-4 ${
                  q.status === "correct"
                    ? "border-green-500/20 bg-green-500/5"
                    : q.status === "incorrect"
                      ? "border-red-500/20 bg-red-500/5"
                      : q.status === "partial"
                        ? "border-yellow-500/20 bg-yellow-500/5"
                        : "border-gray-800 bg-gray-800/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">
                        Q{i + 1}
                      </span>
                      <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded">
                        {categoryLabels[q.category]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {q.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-white">{q.questionText}</p>
                    {q.notes && (
                      <p className="text-xs text-gray-400 mt-2 italic">
                        Notes: {q.notes}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {q.status === "correct" && (
                      <span className="text-green-400 text-sm flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Correct
                      </span>
                    )}
                    {q.status === "incorrect" && (
                      <span className="text-red-400 text-sm flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Incorrect
                      </span>
                    )}
                    {q.status === "partial" && (
                      <span className="text-yellow-400 text-sm flex items-center gap-1">
                        <MinusCircle className="w-4 h-4" /> {q.partialPercent}%
                      </span>
                    )}
                    {q.status === "not_asked" && (
                      <span className="text-gray-500 text-sm flex items-center gap-1">
                        <CircleDot className="w-4 h-4" /> Skipped
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  count,
  total,
  icon,
}: {
  label: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center">
      {icon}
      <span className="text-2xl font-bold text-white mt-2">{count}</span>
      <span className="text-xs text-gray-500">
        of {total} {label.toLowerCase()}
      </span>
    </div>
  );
}
