import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const interviews = await prisma.interview.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      candidate: true,
      questions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ interviews });
}
