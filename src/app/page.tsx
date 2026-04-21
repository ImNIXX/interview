"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Plus,
  Clock,
  CheckCircle,
  Loader2,
  FileText,
  BarChart3,
  User,
  ArrowRight,
  LogOut,
} from "lucide-react";

interface Interview {
  id: string;
  duration: number;
  status: string;
  totalScore: number | null;
  createdAt: string;
  completedAt: string | null;
  candidate: {
    name: string;
    email: string | null;
    resumeFileName: string;
  };
  questions: { id: string; status: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/interviews/list")
      .then((res) => res.json())
      .then((data) => {
        setInterviews(data.interviews);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const completed = interviews.filter((i) => i.status === "completed");
  const pending = interviews.filter((i) => i.status !== "completed");

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Interview Platform</h1>
          </div>
          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-gray-500">{session.user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
            <button
              onClick={() => router.push("/interview/new")}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Interview
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-sm text-gray-400 mb-1">Total Interviews</p>
            <p className="text-3xl font-bold text-white">{interviews.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-sm text-gray-400 mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-400">
              {completed.length}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-sm text-gray-400 mb-1">Average Score</p>
            <p className="text-3xl font-bold text-blue-400">
              {completed.length > 0
                ? (
                    completed.reduce((sum, i) => sum + (i.totalScore || 0), 0) /
                    completed.length
                  ).toFixed(0)
                : "—"}
              {completed.length > 0 && "%"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : interviews.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">
              No interviews yet
            </h2>
            <p className="text-gray-500 mb-6">
              Upload a resume to generate interview questions.
            </p>
            <button
              onClick={() => router.push("/interview/new")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Start First Interview
            </button>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  In Progress ({pending.length})
                </h2>
                <div className="grid gap-3">
                  {pending.map((interview) => (
                    <InterviewCard
                      key={interview.id}
                      interview={interview}
                      onClick={() => router.push(`/interview/${interview.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Completed ({completed.length})
                </h2>
                <div className="grid gap-3">
                  {completed.map((interview) => (
                    <InterviewCard
                      key={interview.id}
                      interview={interview}
                      onClick={() =>
                        router.push(`/interview/${interview.id}/feedback`)
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function InterviewCard({
  interview,
  onClick,
}: {
  interview: Interview;
  onClick: () => void;
}) {
  const scoreColor =
    (interview.totalScore || 0) >= 70
      ? "text-green-400"
      : (interview.totalScore || 0) >= 40
        ? "text-yellow-400"
        : "text-red-400";

  const asked = interview.questions.filter((q) => q.status !== "not_asked");

  return (
    <div
      onClick={onClick}
      className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 hover:bg-gray-900/80 transition cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
            {interview.candidate.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {interview.candidate.name}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {interview.duration}min
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {new Date(interview.createdAt).toLocaleDateString()}
              </span>
              {interview.status === "completed" && (
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {asked.length} questions asked
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {interview.status === "completed" && interview.totalScore !== null ? (
            <span className={`text-2xl font-bold ${scoreColor}`}>
              {interview.totalScore.toFixed(0)}%
            </span>
          ) : (
            <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-sm rounded-full border border-yellow-500/30">
              In Progress
            </span>
          )}
          <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition" />
        </div>
      </div>
    </div>
  );
}
