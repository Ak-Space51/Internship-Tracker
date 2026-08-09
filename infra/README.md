# Ingest stall alarm

Emails you when the scraper stops updating jobs. Without it, a stalled ingest is
only visible as a stale "Boards last checked" line in the site footer, which
requires you to go looking.

An hourly Lambda polls the app's `/api/health` endpoint, publishes the age of
the newest `last_seen_at` as a CloudWatch metric, and a CloudWatch alarm
notifies an SNS topic when that age crosses the threshold.

```
EventBridge (hourly) -> Lambda -> GET /api/health -> CloudWatch metric -> alarm -> SNS -> email
```

It polls the health endpoint instead of connecting to Postgres directly, so no
database credentials or drivers need to exist in AWS, and the check covers the
site and the pipeline together. A dead site fails the check just as a stalled
scraper does.

## Apply

```bash
cd infra
cp example.tfvars terraform.tfvars   # then set alert_email
terraform init
terraform apply -var-file=terraform.tfvars
```

AWS sends a subscription confirmation to `alert_email`. **Click the link in it** —
until you do, alarms fire silently.

## Verify

Run the checker on demand and read its output:

```bash
aws lambda invoke --function-name trackinternships-ingest-monitor /dev/stdout
```

It prints the ingest age, active job count, database latency and the Vercel
region serving the health endpoint. To prove the alerting path end to end, drop
the threshold below the current age and wait for the next evaluation:

```bash
terraform apply -var-file=terraform.tfvars -var max_age_hours=0
```

You should get an ALARM email within about an hour, then an OK email once you
restore the threshold.

## What it costs

Two CloudWatch alarms at $0.10 each per month. The Lambda's 720 monthly
invocations, the custom metrics and SNS email all sit inside the free tier, so
expect roughly $0.20/month.

## Tuning

`max_age_hours` defaults to 13. Ingest runs every 6 hours, so the age normally
peaks just under 6; 13 tolerates one dropped GitHub Actions slot (GitHub does
not backfill missed cron runs) while still catching a real stall. Set it to 8 if
you would rather hear about every missed run.
