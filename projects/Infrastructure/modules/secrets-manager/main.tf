locals {
  # All secret keys the ExternalSecret will pull. Terraform creates the placeholder
  # entries; populate real values via AWS Console or CLI after apply.
  secret_keys = [
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "AUTH_DB_URL",
    "PRODUCTS_DB_URL",
    "ORDERS_DB_URL",
    "USERS_DB_URL",
    "RABBIT_URL",
    "RABBITMQ_USER",
    "RABBITMQ_PASSWORD",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "EMAIL_FROM",
  ]

  oidc_issuer_bare = replace(var.oidc_issuer_url, "https://", "")
}

# One secret per key, named boutique/<KEY> to match aws-external-secret.yml
resource "aws_secretsmanager_secret" "boutique" {
  for_each = toset(local.secret_keys)

  name        = "boutique/${each.key}"
  description = "Boutique app secret: ${each.key}"

  tags = {
    app       = "boutique"
    terraform = "true"
  }
}

# Placeholder value — Terraform creates the secret structure only.
# Real values must be set out-of-band (Console / CLI / CI).
# ignore_changes prevents Terraform from overwriting values on subsequent applies.
resource "aws_secretsmanager_secret_version" "boutique" {
  for_each = toset(local.secret_keys)

  secret_id     = aws_secretsmanager_secret.boutique[each.key].id
  secret_string = "CHANGE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# IAM policy granting ExternalSecrets read access to boutique/* secrets only
data "aws_iam_policy_document" "external_secrets_policy" {
  statement {
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = [
      "arn:aws:secretsmanager:*:*:secret:boutique/*",
    ]
  }
}

resource "aws_iam_policy" "external_secrets" {
  name        = "${var.cluster_name}-external-secrets-policy"
  description = "Allows ExternalSecrets operator to read boutique secrets from AWS SM"
  policy      = data.aws_iam_policy_document.external_secrets_policy.json
}

# IRSA trust policy — scoped to the external-secrets ServiceAccount only
data "aws_iam_policy_document" "external_secrets_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer_bare}:sub"
      values   = ["system:serviceaccount:external-secrets:external-secrets-sa"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer_bare}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "external_secrets_irsa" {
  name               = "${var.cluster_name}-external-secrets-irsa"
  assume_role_policy = data.aws_iam_policy_document.external_secrets_trust.json

  tags = {
    app       = "boutique"
    terraform = "true"
  }
}

resource "aws_iam_role_policy_attachment" "external_secrets_irsa" {
  role       = aws_iam_role.external_secrets_irsa.name
  policy_arn = aws_iam_policy.external_secrets.arn
}
