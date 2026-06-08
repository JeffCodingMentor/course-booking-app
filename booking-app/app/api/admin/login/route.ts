import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { success: false, error: 'admin_password_not_configured' },
        { status: 500 }
      );
    }

    if (password === adminPassword) {
      // Return success along with session token
      return NextResponse.json({ success: true, token: 'admin_token_validated' });
    } else {
      return NextResponse.json(
        { success: false, error: 'invalid_password' },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    );
  }
}
