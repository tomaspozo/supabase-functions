# Supabase Edge Functions Examples

A collection of practical edge function examples for Supabase, showcasing different use cases and integration patterns.

## Overview

This repository contains ready-to-use Supabase Edge Functions that demonstrate how to integrate Supabase with various third-party services and implement common backend functionality.

## Examples

### Linear to Slack Integration

Automatically posts Linear project updates to a Slack channel.

- **Path**: `/supabase/functions/linear-to-slack`
- **Features**:
  - Webhook validation with HMAC signatures
  - GraphQL API integration with Linear
  - Slack message formatting and delivery
  - Functional programming approach

## Getting Started

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Deno](https://deno.land/)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/tomaspozo/supabase-functions.git
   cd supabase-functions
   ```

2. Start the Supabase local development environment:
   ```bash
   supabase start
   ```

3. Deploy functions to your local Supabase instance:
   ```bash
   supabase functions deploy linear-to-slack
   ```

### Environment Variables

Each function may require specific environment variables. Check the function's directory for details.

For the Linear to Slack integration:
- `LINEAR_WEBHOOK_SECRET`: Secret for validating Linear webhooks
- `LINEAR_API_KEY`: API key for accessing Linear GraphQL API
- `SLACK_WEBHOOK_URL`: Webhook URL for your Slack channel
- `SKIP_VALIDATION`: (Optional) Set to "true" to skip webhook validation during development

### Deployment

Deploy to your Supabase project:

```bash
supabase link --project-ref your-project-ref
supabase functions deploy linear-to-slack
supabase secrets set --env-file ./supabase/.env
```

## Contributing

Feel free to contribute by adding new examples or improving existing ones. Please follow the functional programming patterns established in the codebase.

## License

MIT
