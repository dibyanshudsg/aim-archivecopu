import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-server';
import { DEFAULT_SITE_SETTINGS, readSiteSettings } from '@/lib/site-settings';

export async function GET() {
  try {
    const settings = await readSiteSettings(createPublicClient());
    return NextResponse.json({
      feedback_form_url: settings.feedback_form_url,
    });
  } catch {
    return NextResponse.json({
      feedback_form_url: DEFAULT_SITE_SETTINGS.feedback_form_url,
    });
  }
}
