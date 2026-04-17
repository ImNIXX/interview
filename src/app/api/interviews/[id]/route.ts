import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single interview
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  return NextResponse.json({ interview });
}

// UPDATE interview (status, evaluation)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
