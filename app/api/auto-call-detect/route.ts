import { NextResponse } from 'next/server';
import { autoDetectCallYn } from '@/app/lib/data';

/**
 * POST /api/auto-call-detect
 * call_yn 자동 감지: 발행일 이후 MTM=0인 종목의 call_yn을 'Y'로 업데이트
 */
export async function POST() {
  try {
    const result = await autoDetectCallYn();
    return NextResponse.json({
      success: true,
      updated: result.updated,
      details: result.details,
    });
  } catch (error) {
    console.error('Auto call detect error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
