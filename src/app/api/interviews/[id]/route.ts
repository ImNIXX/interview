import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET single interview
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      candidate: true,
      questions: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  // Check ownership
  if (interview.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ interview });
}

// UPDATE interview (status, evaluation)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const existingInterview = await prisma.interview.findUnique({
    where: { id },
  });

  if (!existingInterview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  if (existingInterview.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const interview = await prisma.interview.update({
    where: { id },
    data: {
      status: body.status,
      completedAt: body.status === "completed" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ interview });
}
