const NETLIFY_DEPLOY = `
name: "Site Deploy"

on:
  push:
    branches:
      - main
    tags:
      - 'motion-link-*'

jobs:
  deploy:
    name: "Deploy to Netlify"
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - run: |
          touch .env
          echo NETLIFY_SITE_URL=\${{ secrets.NETLIFY_SITE_URL }} >> .env      
      - run: npm ci && npx motionlink \${{ secrets.MOTION_LINK_VARS }}
      - run: {{BUILD_COMMAND}}
      - uses: jsmrcaga/action-netlify-deploy@v1.6.0
        with:
          NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_DEPLOY_TO_PROD: true
          build_directory: "{{PUBLIC_FOLDER}}"
`;

export function getNetlifyDeployWorkflow(buildCommand: string, publicFolder: string): string {
  return NETLIFY_DEPLOY.replace('{{BUILD_COMMAND}}', buildCommand).replace('{{PUBLIC_FOLDER}}', publicFolder);
}
