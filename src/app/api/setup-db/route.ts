import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// IMPORTANT: Only run this ONCE after deployment
// Then DELETE this file or add proper authentication
export async function POST(request: Request) {
  try {
    // Optional: Add a secret token for protection
    const { secret } = await request.json();
    if (secret !== process.env.SETUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run Prisma push
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');

    return NextResponse.json({
      success: true,
      output: stdout,
      errors: stderr
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error)
    }, { status: 500 });
  }
}
