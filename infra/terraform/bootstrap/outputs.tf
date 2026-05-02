output "backend_tf" {
  description = "Backend block to copy into infra/terraform/backend.tf."
  value       = <<-EOT
    terraform {
      backend "s3" {
        bucket         = "${aws_s3_bucket.state.bucket}"
        dynamodb_table = "${aws_dynamodb_table.locks.name}"
        encrypt        = true
        key            = "${var.environment}/terraform.tfstate"
        region         = "${var.aws_region}"
      }
    }
  EOT
}

output "lock_table_name" {
  description = "DynamoDB table used for Terraform state locking."
  value       = aws_dynamodb_table.locks.name
}

output "state_bucket_name" {
  description = "S3 bucket used for Terraform state."
  value       = aws_s3_bucket.state.bucket
}
