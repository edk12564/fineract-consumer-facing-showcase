export const siteConfig = {
  siteTitle: 'Fineract Consumer Facing',
  tagline:
    'Fineract Consumer Facing is a 2026 GSoC project for the Apache Software Foundation',
  description: 'TODO: fill in project description',
  repoUrl: 'https://github.com/apache/fineract-consumer-facing',
  upstreamUrl: 'https://fineract.apache.org',
  // Replace with a hosted URL before deploying — public/demo/ is gitignored (file too large).
  demoVideoUrl: `${import.meta.env.BASE_URL}demo/FineractConsumerFacingDemo.mov`,
};

export type SiteConfig = typeof siteConfig;
