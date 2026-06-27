# Email Draft: AIM Archive Project Update

## Purpose

Send a clear project update to Kaushal Ji, Hemlata Di, Divyanshu Ji, and the Auro Society team: why the project paused, where it stands now, what remains under active work, and what is needed next to begin uploading All India Magazine issues.

## Suggested Subject

Update on AIM Archive Project and Next Steps for Upload

## Ready-To-Send Email

Dear Kaushal Ji, Hemlata Di, Divyanshu Ji, and Auro Society Team,

Warm greetings.

I hope you are all doing well.

I wanted to share a proper update on the AIM Archive project, since it had been on pause for some time.

The pause was mainly because the basic platform work had reached a stable point, and the next stage required coordination on content, storage, domain, and Society-side account ownership. I also wanted to avoid pushing the project forward in a half-ready way before the upload pipeline, storage direction, and long-term ownership structure were clear.

I am continuing the work actively. This update is only to align everyone before the next phase, so that the technical setup, account ownership, and magazine upload process move forward cleanly.

### Current State of the Project

The AIM Archive is now a working web-based digital archive for Sri Aurobindo Society's magazine publications, starting with All India Magazine and Agnishikha.

What is already built:

1. Public website with homepage, browse page, search page, issue detail page, bookmarks, and in-browser PDF reader.
2. Admin login and admin dashboard.
3. Magazine management for All India Magazine and Agnishikha.
4. Issue upload system for PDFs.
5. Bulk PDF upload flow.
6. Automatic cover thumbnail generation from uploaded PDFs.
7. Optional manual cover image upload/replacement.
8. OCR-based text extraction for uploaded PDFs.
9. Search across issue title, theme title, topics, description, and PDF text.
10. Topic tag management.
11. Publish/unpublish controls for issues.
12. Read/download counters and basic archive analytics.

Current temporary public URL:

`https://aim-archive.vercel.app`

The planned Society URL remains:

`https://aimarchive.aurosociety.org`

### What I Need From Each Person

1. Kaushal Ji:
   - Please confirm that we should continue with the current direction: Vercel for hosting, Cloudflare R2 for PDF/file storage, and `aimarchive.aurosociety.org` as the Society archive subdomain.
   - Please also confirm that the final hosting/storage/domain setup should be under Sri Aurobindo Society-owned accounts for long-term continuity.

2. Hemlata Di:
   - Please help us begin with one complete year of All India Magazine PDFs.
   - Any year is fine. The priority is to start with one clean, complete batch so that we can test the full upload, cover, OCR, search, and publishing workflow.
   - I have created a Google Drive folder for this first upload batch:

     `https://drive.google.com/drive/folders/114Ou0zzQGJbx-8lvCuLXPKWHiUnPDSeP?usp=drive_link`

3. Divyanshu Ji:
   - Please help coordinate the Society-side technical setup: Vercel account, domain/DNS connection, database environment setup, and any required Cloudflare R2/Vercel configuration.
   - No secrets or credentials need to be shared in this email thread. If any keys or tokens are required later, they should be shared only through a private channel.

### Technical Details for Divyanshu Ji

These are the main technical details relevant from the Society infrastructure side.

Current technical setup:

1. Web app: Next.js 15, React 19, TypeScript, Tailwind CSS.
2. Hosting: Vercel.
3. Current production URL: `https://aim-archive.vercel.app`
4. Planned Society subdomain: `https://aimarchive.aurosociety.org`
5. Required DNS record for the planned subdomain:
   - Type: `CNAME`
   - Name/Host: `aimarchive`
   - Target: `cname.vercel-dns.com`
6. File storage: Cloudflare R2 bucket for new uploads.
7. Stored files: source PDFs, generated cover thumbnails, and uploaded cover images.
8. Database:
   - Supabase was used initially for database records and early file storage.
   - Cloudflare R2 is now the preferred storage path for PDFs and cover images.
   - Turso/libSQL is being prepared as the long-term lightweight database option for magazine records, issue metadata, admin data, OCR search rows, counters, and settings.
   - Final database provider should be confirmed before official launch, so production does not depend on an account or free-tier setup that may become fragile later.
9. Admin upload system:
   - Single issue upload is available.
   - Bulk PDF upload is available.
   - Magazine, month, and year can be detected from file names.
   - Magazine title is auto-generated.
   - Theme title, topic tags, and description can be added manually.
10. Search system:
   - Uploaded PDFs are processed for OCR text extraction.
   - Search supports issue title, theme title, topics, description, and PDF text content.
11. Reader system:
   - Public users can browse, search, open, read, bookmark, and download published issues.
12. Admin system:
   - Admin login is already implemented.
   - Admins can upload, edit, publish/unpublish, replace covers, replace PDFs, reindex OCR, and manage topic tags.

Important technical notes:

1. No passwords, API keys, database credentials, R2 tokens, or Vercel environment variables should be shared in email threads.
2. If any credentials need to be shared, they should be sent through a private channel only.
3. Before final public rollout on the Society subdomain, we should verify:
   - R2 storage credentials are active in Vercel.
   - Database credentials are active in Vercel.
   - The custom domain is connected and SSL is provisioned.
   - Admin upload works on production.
   - PDF reader, covers, search, and downloads work with newly uploaded files.

### Cost and Account Ownership

The project should eventually run fully under Sri Aurobindo Society-owned accounts, not under my personal accounts. This is important for long-term continuity, billing, access control, and ownership of the archive.

Expected ownership and cost structure:

1. Domain/subdomain:
   - `aurosociety.org` is already Society-owned.
   - The planned archive subdomain is `aimarchive.aurosociety.org`.
   - DNS changes need to be handled from the Society's domain/DNS account.

2. Cloudflare R2 storage:
   - The R2 bucket should remain under a Society-controlled Cloudflare account.
   - R2 is used for storing PDFs, cover images, and generated thumbnails.
   - This keeps file bandwidth costs low, because Cloudflare R2 has zero egress charges.
   - Any Cloudflare billing, if usage grows beyond the free tier, should belong to the Society account.

3. Database: Supabase / Turso:
   - Supabase was used initially because it made the first version fast to build: database, storage, and admin data could all be managed from one platform.
   - However, for the long-term archive, file storage is better kept in Cloudflare R2 and the database should be under a Society-controlled setup.
   - Turso/libSQL is a lightweight database option being prepared for this project, mainly to reduce dependency on Supabase free-tier limitations and keep the archive portable.
   - If we continue with Supabase for any part of production, the Supabase project should also be under Society ownership, not a personal account.
   - If we move fully to Turso, the Turso database and billing/account ownership should also be under the Society or an approved Society technical account.
   - Final choice before official launch: either Society-owned Supabase, or Society-owned Turso. My recommendation is to move toward Turso for the database and R2 for file storage, after final verification.

4. Vercel hosting:
   - The app is currently deployed on Vercel because it is the most convenient and compatible hosting platform for this Next.js app.
   - Current temporary production URL: `https://aim-archive.vercel.app`
   - For the official launch, Sri Aurobindo Society should create or use a proper Society-owned Vercel account.
   - Later, I can transfer the Vercel project to the Society's Vercel account.
   - After transfer, the Society account will own the deployment, environment variables, domain connection, and billing.
   - The exact Vercel plan can be decided based on Society requirements for production traffic, team access, and billing preference.

5. Recommended final ownership model:
   - Domain/DNS: Society account.
   - Cloudflare R2: Society account.
   - Database: Society-owned Turso or Society-owned Supabase, depending on final verification.
   - Vercel: Society account.
   - Repository/admin access: shared with the required technical maintainers only.

This avoids future dependency on any individual person's account and makes the archive maintainable as an official Society digital property.

I am not adding exact recurring cost numbers here because the final cost will depend on selected Vercel plan, traffic, PDF storage volume, database provider, and team access needs. The main direction is that the domain, R2 storage, database, and Vercel hosting should all be under Society ownership before the archive becomes an official public property.

### Upload Plan for Hemlata Di

The platform already supports PDF upload, automatic cover generation, OCR-based search indexing, issue metadata, topic tags, and public reading/download workflows. To move forward smoothly, we can start with any one complete year of All India Magazine issues. Please choose whichever year is easiest to provide first.

Google Drive folder for the first upload batch:

`https://drive.google.com/drive/folders/114Ou0zzQGJbx-8lvCuLXPKWHiUnPDSeP?usp=drive_link`

For the first batch, it would be ideal to receive:

1. The 12 monthly PDF files for one year of All India Magazine.
2. File names in a consistent format, for example:
   - `All India Magazine Jan-2024.pdf`
   - `All India Magazine Feb-2024.pdf`
3. The theme/title printed on each issue cover, if available separately.
4. Optional topic tags for each issue, such as `Surrender`, `Education`, `Integral Yoga`, `The Mother`, etc.
5. If available, separate front and back cover files. If not, the system can generate the cover thumbnail from the PDF itself.

Suggested folder structure:

```text
All India Magazine/
  2024/
    All India Magazine Jan-2024.pdf
    All India Magazine Feb-2024.pdf
    All India Magazine Mar-2024.pdf
```

For best quality, the preferred files are the original/vector PDFs rather than browser "Print to PDF" copies or low-resolution scanned versions. If images are embedded in the PDFs, 300 DPI quality is preferable.

Please also ensure that I have upload/download access to the Google Drive folder, so that I can retrieve the files and begin the upload work without delay.

Once the first year's files are uploaded to the Google Drive folder, I will upload them into the AIM Archive, verify the covers, check that OCR/search indexing is working correctly, and confirm that the issues are appearing properly in the archive. After this first batch is verified, we can continue year by year.

### Immediate Next Steps

1. Hemlata Di can upload one complete year of All India Magazine PDFs to the Google Drive folder.
2. Divyanshu Ji can confirm the Society-side Vercel account and domain/DNS path.
3. I will upload the first batch into the archive and verify PDF loading, covers, OCR indexing, search, and issue pages.
4. I will share the preview links after verification.
5. Once the first year is confirmed, we can continue year by year.

If possible, we can begin with the first year's files this week, or whenever convenient for Hemlata Di.

Regards,  
Mugdhanil
