import { NextResponse } from 'next/server';
import { readSiteSettingsFromDb } from '@/lib/db';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';

export async function GET() {
  try {
    const settings = await readSiteSettingsFromDb();
    return NextResponse.json({
      feedback_form_url: settings.feedback_form_url,
    });
  } catch {
    return NextResponse.json({
      feedback_form_url: DEFAULT_SITE_SETTINGS.feedback_form_url,
    });
  }
}
