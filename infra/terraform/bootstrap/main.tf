data "aws_caller_identity" "current" {}

locals {
  lock_table_name   = "${var.project_name}-${var.environment}-terraform-locks"
  state_bucket_name = var.state_bucket_name != "" ? var.state_bucket_name : "${var.project_name}-${var.environment}-terraform-state-${data.aws_caller_identity.current.account_id}-${var.aws_region}"
}

resource "aws_s3_bucket" "state" {
  bucket = local.state_bucket_name
}

resource "aws_s3_bucket_public_access_block" "state" {
  block_public_acls       = true
  block_public_policy     = true
  bucket                  = aws_s3_bucket.state.id
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_dynamodb_table" "locks" {
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  name         = local.lock_table_name

  attribute {
    name = "LockID"
    type = "S"
  }
}
