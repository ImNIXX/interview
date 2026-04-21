import { NextRequest, NextResponse } from "next/server";
import openrouter from "@/lib/openai";
// import { gemini } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import type { GeneratedQuestion } from "@/lib/types";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("resume") as File | null;
    const candidateName = formData.get("candidateName") as string;
    const candidateEmail = formData.get("candidateEmail") as string | null;
    const duration = parseInt(formData.get("duration") as string) || 30;
    const role = (formData.get("role") as string) || "";

    if (!file || !candidateName) {
      return NextResponse.json(
        { error: "Resume file and candidate name are required" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    // Parse PDF using pdf2json (native Node.js, works in serverless)
    const PDFParser = (await import("pdf2json")).default;
    const buffer = Buffer.from(await file.arrayBuffer());

    const pdfParser = new PDFParser();
    const resumeText = await new Promise<string>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData: Error | { parserError: Error }) => {
        const error = errData instanceof Error ? errData : errData.parserError;
        reject(error);
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: unknown) => {
        try {
          // Helper function to safely decode URI-encoded text
          const safeDecode = (encoded: string): string => {
            try {
              return decodeURIComponent(encoded);
            } catch {
              // If decoding fails, return the original string
              return encoded;
            }
          };

          // Extract text from all pages using the data structure
          let text = "";

          if (pdfData && typeof pdfData === 'object' && 'Pages' in pdfData) {
            const data = pdfData as { Pages?: Array<{ Texts?: Array<{ R?: Array<{ T?: string }> }> }> };

            if (data.Pages) {
              for (const page of data.Pages) {
                if (page.Texts) {
                  for (const textItem of page.Texts) {
                    if (textItem.R) {
                      for (const run of textItem.R) {
                        if (run.T) {
                          // Safely decode URI-encoded text
                          text += safeDecode(run.T) + " ";
                        }
                      }
                    }
                  }
                  text += "\n";
                }
              }
            }
          }

          // Fallback to getRawTextContent if data structure parsing fails
          if (!text.trim() && typeof pdfParser.getRawTextContent === 'function') {
            text = pdfParser.getRawTextContent();
          }

          resolve(text);
        } catch (err) {
          reject(err);
        }
      });

      pdfParser.parseBuffer(buffer);
    });

    if (!resumeText.trim()) {
      console.error("PDF parsing resulted in empty text");
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 400 }
      );
    }

    // Generate questions using Gemini
    const questionCount = duration === 30 ? 15 : 30;
    const prompt = buildPrompt(resumeText, duration, questionCount, role);

    // --- Gemini (commented out) ---
    // const systemPrompt = "You are an expert technical interviewer...";
    // const result = await gemini.generateContent({ ... });
    // const responseText = result.response.text();

    // --- OpenRouter ---
    const completion = await openrouter.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content:
            "You are an expert technical interviewer. Generate interview questions based on the candidate's resume. Return ONLY valid JSON, no markdown or extra text.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 16000,
      response_format: { type: "json_object" },
    });
    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json(
        { error: "Failed to generate questions" },
        { status: 500 }
      );
    }

    // Strip markdown code fences and extract raw JSON
    let jsonText = responseText.trim();
    const fenceMatch = jsonText.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }
    if (!jsonText.startsWith("{") && !jsonText.startsWith("[")) {
      const braceIdx = jsonText.indexOf("{");
      if (braceIdx !== -1) {
        jsonText = jsonText.substring(braceIdx);
      }
    }

    // Escape control characters ONLY inside JSON string literals.
    // Walk through char-by-char, track if we're inside a "..." string,
    // and replace raw control chars with their escape sequences.
    jsonText = sanitizeJsonStrings(jsonText);

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      // If JSON is truncated/malformed, try to fix common issues
      // 1. Try closing any unterminated strings and brackets
      let fixedJson = jsonText;

      // If the response was cut off, try to close it properly
      // Remove any trailing incomplete object/entry
      const lastCompleteObj = fixedJson.lastIndexOf("}");
      if (lastCompleteObj !== -1) {
        fixedJson = fixedJson.substring(0, lastCompleteObj + 1);
        // Ensure we close the questions array and outer object
        if (!fixedJson.endsWith("]}")) {
          fixedJson += "]}";
        }
      }

      try {
        parsed = JSON.parse(fixedJson);
      } catch {
        console.error("AI response JSON parse failed. Raw response:", responseText.substring(0, 500));
        return NextResponse.json(
          { error: "AI returned malformed response. Please try again." },
          { status: 500 }
        );
      }
    }
    const questions: GeneratedQuestion[] = parsed.questions;

    // Save candidate
    const candidate = await prisma.candidate.create({
      data: {
        name: candidateName,
        email: candidateEmail || null,
        resumeText,
        resumeFileName: file.name,
      },
    });

    // Create interview with questions
    const interview = await prisma.interview.create({
      data: {
        candidateId: candidate.id,
        userId: session.user.id,
        duration,
        status: "pending",
        questions: {
          create: questions.map((q, index) => ({
            category: q.category,
            questionText: q.questionText,
            expectedAnswer: q.expectedAnswer,
            difficulty: q.difficulty,
            orderIndex: index,
            status: "not_asked",
          })),
        },
      },
      include: { questions: true, candidate: true },
    });

    return NextResponse.json({ interview });
  } catch (error) {
    console.error("Interview creation error:", error);
    const message = error instanceof Error ? error.message : "Failed to create interview";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

function buildPrompt(
  resumeText: string,
  duration: number,
  questionCount: number,
  role: string
): string {
  const categoryDistribution =
    duration === 30
      ? "4 theoretical, 4 logical, 3 tricky, 4 hands-on"
      : "8 theoretical, 8 logical, 6 tricky, 8 hands-on";

  const roleInstruction = role
    ? `\nROLE FOCUS: The interview is specifically for a "${role}" position. Focus ALL questions on skills, technologies, and scenarios relevant to this role. Even if the resume lists other skills, only ask questions relevant to the "${role}" role.\n`
    : "";

  return `Based on this candidate's resume, generate ${questionCount} interview questions for a ${duration}-minute interview.
${roleInstruction}
RESUME:
${resumeText.substring(0, 6000)}

DISTRIBUTION: Generate exactly ${categoryDistribution} questions.

CATEGORIES:
- theoretical: Conceptual knowledge questions about technologies on the resume
- logical: Problem-solving, algorithmic thinking, system design reasoning
- tricky: Edge cases, gotchas, common misconceptions about their tech stack
- hands_on: Practical coding scenarios, "how would you implement..." questions

DIFFICULTY: Mix of easy (30%), medium (50%), hard (20%)

IMPORTANT: Questions must be specific to the candidate's skills and experience listed in the resume. Each question should have a detailed expected answer.

Return JSON in this exact format:
{
  "questions": [
    {
      "category": "theoretical",
      "questionText": "...",
      "expectedAnswer": "...",
      "difficulty": "medium"
    }
  ]
}`;
}

/**
 * Escapes control characters that appear inside JSON string literals,
 * leaving structural whitespace (between keys/values) untouched.
 */
function sanitizeJsonStrings(input: string): string {
  const result: string[] = [];
  let inString = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (inString) {
      if (ch === "\\") {
        // Escaped character — pass through both the backslash and next char
        result.push(ch);
        i++;
        if (i < input.length) {
          result.push(input[i]);
        }
      } else if (ch === '"') {
        // End of string
        result.push(ch);
        inString = false;
      } else if (ch === "\n") {
        result.push("\\n");
      } else if (ch === "\r") {
        result.push("\\r");
      } else if (ch === "\t") {
        result.push("\\t");
      } else if (ch.charCodeAt(0) < 0x20) {
        // Other control characters — drop them
      } else {
        result.push(ch);
      }
    } else {
      if (ch === '"') {
        inString = true;
      }
      result.push(ch);
    }
    i++;
  }

  return result.join("");
}
