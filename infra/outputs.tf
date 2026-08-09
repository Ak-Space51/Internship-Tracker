output "lambda_function_name" {
  description = "Invoke manually with: aws lambda invoke --function-name <this> /dev/stdout"
  value       = aws_lambda_function.monitor.function_name
}

output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}

output "alarm_names" {
  value = [
    aws_cloudwatch_metric_alarm.stale_ingest.alarm_name,
    aws_cloudwatch_metric_alarm.checker_errors.alarm_name,
  ]
}
