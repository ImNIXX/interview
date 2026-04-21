import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import openrouter from "@/lib/openai";
// import { gemini } from "@/lib/gemini";
import { auth } from "@/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check ownership first
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { candidate: true },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    if (interview.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { evaluations } = body as {
      evaluations: {
        questionId: string;
        status: string;
        partialPercent?: number;
        notes?: string;
      }[];
    };

    // Update each question's evaluation
    for (const evaluation of evaluations) {
      await prisma.question.update({
        where: { id: evaluation.questionId },
        data: {
          status: evaluation.status,
          partialPercent:
            evaluation.status === "partial"
              ? evaluation.partialPercent
              : null,
          notes: evaluation.notes || null,
        },
      });
    }

    // Calculate score
    const questions = await prisma.question.findMany({
      where: { interviewId: id },
      orderBy: { orderIndex: "asc" },
    });

    const askedQuestions = questions.filter((q) => q.status !== "not_asked");
    let totalScore = 0;
    const maxScore = askedQuestions.length * 100;

    for (const q of askedQuestions) {
      if (q.status === "correct") totalScore += 100;
      else if (q.status === "partial") totalScore += q.partialPercent || 0;
    }

    const scorePercent = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Generate AI feedback summary (using interview we already fetched)
    const feedbackPrompt = buildFeedbackPrompt(
      interview.candidate.name,
      questions,
      scorePercent,
      interview.duration
    );

    // --- Gemini (commented out) ---
    // const systemPrompt = "You are an expert interviewer...";
    // const result = await gemini.generateContent({ ... });
    // const feedbackSummary = result.response.text() || "Unable to generate feedback.";

    // --- OpenRouter ---
    const completion = await openrouter.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content:
            "You are an expert interviewer providing candidate evaluation feedback. Be constructive and specific.",
        },
        { role: "user", content: feedbackPrompt },
      ],
      temperature: 0.5,
    });
    const feedbackSummary =
      completion.choices[0]?.message?.content || "Unable to generate feedback.";

    // Update interview with score and feedback
    const updatedInterview = await prisma.interview.update({
      where: { id },
      data: {
        status: "completed",
        totalScore: scorePercent,
        maxScore: 100,
        feedbackSummary,
        completedAt: new Date(),
      },
      include: {
        candidate: true,
        questions: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json({ interview: updatedInterview });
  } catch (error) {
    console.error("Evaluate error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate interview" },
      { status: 500 }
    );
  }
}

interface QuestionData {
  category: string;
  questionText: string;
  expectedAnswer: string;
  difficulty: string;
  status: string;
  partialPercent: number | null;
  notes: string | null;
}

function buildFeedbackPrompt(
  candidateName: string,
  questions: QuestionData[],
  scorePercent: number,
  duration: number
): string {
  const breakdown = questions
    .map((q, i) => {
      let result = `${i + 1}. [${q.category.toUpperCase()} - ${q.difficulty}] "${q.questionText}"`;
      result += `\n   Status: ${q.status}`;
      if (q.status === "partial")
        result += ` (${q.partialPercent}% correct)`;
      if (q.notes) result += `\n   Notes: ${q.notes}`;
      return result;
    })
    .join("\n\n");

  const asked = questions.filter((q) => q.status !== "not_asked");
  const correct = questions.filter((q) => q.status === "correct").length;
  const incorrect = questions.filter((q) => q.status === "incorrect").length;
  const partial = questions.filter((q) => q.status === "partial").length;
  const notAsked = questions.filter((q) => q.status === "not_asked").length;

  const categoryBreakdown = ["theoretical", "logical", "tricky", "hands_on"]
    .map((cat) => {
      const catQs = asked.filter((q) => q.category === cat);
      const catCorrect = catQs.filter((q) => q.status === "correct").length;
      return `  ${cat}: ${catCorrect}/${catQs.length} correct`;
    })
    .join("\n");

  return `Generate a comprehensive interview feedback for candidate "${candidateName}".

INTERVIEW DETAILS:
- Duration: ${duration} minutes
- Overall Score: ${scorePercent.toFixed(1)}%
- Questions Asked: ${asked.length}/${questions.length}
- Correct: ${correct}, Incorrect: ${incorrect}, Partial: ${partial}, Not Asked: ${notAsked}

CATEGORY BREAKDOWN:
${categoryBreakdown}

DETAILED RESULTS:
${breakdown}

Please provide:
1. Overall Assessment (2-3 sentences)
2. Strengths (bullet points)
3. Areas for Improvement (bullet points) 
4. Category-wise Analysis
5. Hiring Recommendation (Strong Hire / Hire / Maybe / No Hire) with reasoning
6. Suggested topics for follow-up if the candidate advances`;
}
