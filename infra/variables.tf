variable "aws_region" {
  description = "Region to create the monitoring stack in."
  type        = string
  default     = "ap-south-1"
}

variable "alert_email" {
  description = "Address that receives stall alerts. AWS emails a confirmation link that you must click before any alarm can reach you."
  type        = string
}

variable "health_url" {
  description = "Fully qualified URL of the app's /api/health endpoint."
  type        = string
  default     = "https://internship-trackerf.vercel.app/api/health"
}

variable "max_age_hours" {
  description = "Alarm when the newest last_seen_at is older than this. Ingest runs every 6 hours, so 13 tolerates one dropped GitHub Actions slot while still catching a genuine stall."
  type        = number
  default     = 13
}

variable "check_interval" {
  description = "How often to poll the health endpoint, as an EventBridge schedule expression."
  type        = string
  default     = "rate(1 hour)"
}
