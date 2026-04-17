import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const interviews = await prisma.interview.findMany({
    include: {
      candidate: true,
      questions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ interviews });
}
