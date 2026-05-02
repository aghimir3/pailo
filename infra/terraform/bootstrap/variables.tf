variable "aws_region" {
  type        = string
  description = "AWS region for Terraform state resources."
  default     = "ap-south-1"
}

variable "environment" {
  type        = string
  description = "Environment name used in state resource names."
  default     = "prod"
}

variable "project_name" {
  type        = string
  description = "Short project name used in state resource names."
  default     = "pailo"
}

variable "state_bucket_name" {
  type        = string
  description = "Optional explicit globally unique S3 bucket name for Terraform state. Leave empty to derive one from account ID and region."
  default     = ""
}
