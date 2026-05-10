import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const githubToken = Deno.env.get('GITHUB_PAT');
    
    if (!githubToken) {
      return Response.json({ error: 'GITHUB_PAT not configured' }, { status: 500 });
    }

    // Fetch merged PRs from GitHub (main branch, sorted by merge date)
    const response = await fetch(
      'https://api.github.com/repos/YOUR_OWNER/air/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=50',
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Base44-PR-Tracker',
        },
      }
    );

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} ${response.statusText}`);
      return Response.json(
        { error: `GitHub API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const prs = await response.json();
    const now = new Date().toISOString();

    // Filter only merged PRs
    const mergedPRs = prs.filter(pr => pr.merged_at !== null);

    // Upsert each PR into Base44
    for (const pr of mergedPRs) {
      const prData = {
        prNumber: pr.number,
        title: pr.title,
        author: pr.user.login,
        status: 'merged',
        mergedAt: pr.merged_at,
        url: pr.html_url,
        lastCheckedAt: now,
      };

      // Check if PR already exists
      const existing = await base44.asServiceRole.entities.PullRequest.filter(
        { prNumber: pr.number }
      );

      if (existing.length > 0) {
        // Update existing
        await base44.asServiceRole.entities.PullRequest.update(existing[0].id, prData);
      } else {
        // Create new
        await base44.asServiceRole.entities.PullRequest.create(prData);
      }
    }

    console.log(`✓ Tracked ${mergedPRs.length} merged PRs`);
    return Response.json({
      success: true,
      prCount: mergedPRs.length,
      lastCheck: now,
    });
  } catch (error) {
    console.error('Error tracking PRs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});