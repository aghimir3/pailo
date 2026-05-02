resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "files" {
  bucket        = "${local.name_prefix}-files-${random_id.bucket_suffix.hex}"
  force_destroy = var.force_destroy_buckets

  tags = {
    Name = "${local.name_prefix}-files"
  }
}

resource "aws_s3_bucket_public_access_block" "files" {
  block_public_acls       = true
  block_public_policy     = true
  bucket                  = aws_s3_bucket.files.id
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "files" {
  bucket = aws_s3_bucket.files.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    id     = "temporary-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    expiration {
      days = 7
    }

    filter {
      prefix = "tmp/"
    }
  }

  rule {
    id     = "old-generated-labels"
    status = "Enabled"

    expiration {
      days = 365
    }

    filter {
      prefix = "labels/generated/"
    }
  }
}

resource "aws_ecr_repository" "frontend" {
  image_tag_mutability = "MUTABLE"
  name                 = "${local.name_prefix}/frontend"

  encryption_configuration {
    encryption_type = "AES256"
  }

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "backend" {
  image_tag_mutability = "MUTABLE"
  name                 = "${local.name_prefix}/backend"

  encryption_configuration {
    encryption_type = "AES256"
  }

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "frontend" {
  repository = aws_ecr_repository.frontend.name

  policy = jsonencode({
    rules = [
      {
        action = {
          type = "expire"
        }
        description  = "Keep the last 20 frontend images"
        rulePriority = 1
        selection = {
          countNumber = 20
          countType   = "imageCountMoreThan"
          tagStatus   = "any"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        action = {
          type = "expire"
        }
        description  = "Keep the last 20 backend images"
        rulePriority = 1
        selection = {
          countNumber = 20
          countType   = "imageCountMoreThan"
          tagStatus   = "any"
        }
      }
    ]
  })
}
