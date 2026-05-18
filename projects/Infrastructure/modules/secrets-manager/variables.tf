variable "cluster_name" {
  type        = string
  description = "EKS cluster name, used to namespace IAM resources"
}

variable "oidc_provider_arn" {
  type        = string
  description = "ARN of the EKS OIDC provider (from eks module output)"
}

variable "oidc_issuer_url" {
  type        = string
  description = "OIDC issuer URL of the EKS cluster (from eks module output)"
}
