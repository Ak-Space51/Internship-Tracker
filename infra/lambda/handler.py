"""Publish ingest freshness to CloudWatch.

Polls the app's /api/health endpoint rather than the database directly, so no
credentials or database drivers live in AWS and the check covers the site and
the pipeline together. Stdlib only, which keeps the deployment a plain zip.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

import boto3  # provided by the Lambda runtime

NAMESPACE = "TrackInternships"
HEALTH_URL = os.environ["HEALTH_URL"]
TIMEOUT_SECONDS = 15

cloudwatch = boto3.client("cloudwatch")


def _put(metrics: list[dict]) -> None:
    cloudwatch.put_metric_data(Namespace=NAMESPACE, MetricData=metrics)


def handler(event, context):  # noqa: ARG001 — Lambda signature
    request = urllib.request.Request(
        HEALTH_URL, headers={"User-Agent": "TrackInternships-HealthCheck/1.0"}
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read())
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        # Publish nothing. The alarm treats missing data as breaching, so a
        # site that is down or unreachable still pages us.
        print(f"health check failed: {type(exc).__name__}: {exc}")
        raise

    age_hours = payload.get("ageHours")
    if age_hours is None:
        print(f"no ingest timestamp yet: {payload}")
        raise RuntimeError("health endpoint reported no lastIngestAt")

    metrics = [
        {
            "MetricName": "IngestAgeHours",
            "Value": float(age_hours),
            "Unit": "Count",
        },
        {
            "MetricName": "ActiveJobs",
            "Value": float(payload.get("activeJobs", 0)),
            "Unit": "Count",
        },
    ]
    if isinstance(payload.get("dbMs"), (int, float)):
        metrics.append(
            {
                "MetricName": "DatabaseLatencyMs",
                "Value": float(payload["dbMs"]),
                "Unit": "Milliseconds",
            }
        )

    _put(metrics)
    print(
        f"ingest age {age_hours}h, {payload.get('activeJobs')} active jobs, "
        f"db {payload.get('dbMs')}ms, region {payload.get('region')}"
    )
    return {"ageHours": age_hours}
