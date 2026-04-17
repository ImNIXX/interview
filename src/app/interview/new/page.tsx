"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Clock, Loader2 } from "lucide-react";

export default function NewInterviewPage() {
  const router = useRouter();
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [duration, setDuration] = useState(30);
  const [role, setRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const presetRoles = [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "DevOps Engineer",
    "Mobile Developer",
    "Data Engineer",
    "QA Engineer",
  ];

  const effectiveRole = role === "__custom" ? customRole : role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !candidateName) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("candidateName", candidateName);
      formData.append("candidateEmail", candidateEmail);
      formData.append("duration", duration.toString());
      if (effectiveRole) formData.append("role", effectiveRole);

      const res = await fetch("/api/interviews", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create interview");
      }

      const data = await res.json();
      router.push(`/interview/${data.interview.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <a
            href="/"
            className="text-lg font-semibold text-white hover:text-blue-400 transition"
          >
            ← Dashboard
          </a>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">New Interview</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Start New Interview</h1>
        <p className="text-gray-400 mb-8">
          Upload a resume and AI will generate tailored interview questions.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Candidate Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Candidate Name *
            </label>
            <input
              type="text"
              required
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="John Doe"
            />
          </div>

          {/* Candidate Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Candidate Email (optional)
            </label>
            <input
              type="email"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="john@example.com"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Clock className="inline w-4 h-4 mr-1" />
              Interview Duration
            </label>
            <div className="flex gap-4">
              {[30, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-3 rounded-lg border-2 font-medium transition ${
                    duration === d
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  {d} minutes
                  <span className="block text-xs mt-1 opacity-70">
                    {d === 30 ? "~15 questions" : "~30 questions"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Role / Focus */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Interview Focus / Role (optional)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Pick a role or type your own to focus questions on a specific
              area, even if the resume covers more.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {presetRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(role === r ? "" : r);
                    setCustomRole("");
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                    role === r
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  {r}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setRole(role === "__custom" ? "" : "__custom");
                }}
                className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                  role === "__custom"
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600"
                }`}
              >
                Custom...
              </button>
            </div>
            {role === "__custom" && (
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g. React Developer, Node.js Backend, System Design..."
              />
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resume (PDF) *
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer hover:border-blue-500/50 ${
                file
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-gray-700 bg-gray-900"
              }`}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-gray-500" />
              {file ? (
                <p className="text-green-400 font-medium">{file.name}</p>
              ) : (
                <>
                  <p className="text-gray-400">Click to upload PDF resume</p>
                  <p className="text-sm text-gray-600 mt-1">
                    PDF only, max 10MB
                  </p>
                </>
              )}
              <input
                id="fileInput"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size <= 10 * 1024 * 1024) setFile(f);
                  else if (f) setError("File size must be under 10MB");
                }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file || !candidateName}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Questions... (this may take a moment)
              </>
            ) : (
              <>Generate Interview Questions</>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
