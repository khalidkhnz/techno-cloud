import * as aws from "@pulumi/aws";
import { baseDomain, tags } from "./config.js";

/**
 * Route 53 hosted zone + wildcard ACM certificate for `*.${baseDomain}` (and the apex).
 * ACM public certs are free; DNS-validated automatically via the zone. The wildcard cert
 * covers every app subdomain and preview URL. Route 53 zone is ~$0.50/mo.
 */
export const zone = new aws.route53.Zone("zone", {
  name: baseDomain,
  tags,
});

export const certificate = new aws.acm.Certificate("wildcard", {
  domainName: `*.${baseDomain}`,
  subjectAlternativeNames: [baseDomain],
  validationMethod: "DNS",
  tags,
});

// Wildcard + apex validate with the same CNAME, so a single record suffices.
const validationOption = certificate.domainValidationOptions[0]!;

const validationRecord = new aws.route53.Record("cert-validation", {
  zoneId: zone.zoneId,
  name: validationOption.resourceRecordName,
  type: validationOption.resourceRecordType,
  records: [validationOption.resourceRecordValue],
  ttl: 60,
  allowOverwrite: true,
});

export const certificateValidation = new aws.acm.CertificateValidation("wildcard-validation", {
  certificateArn: certificate.arn,
  validationRecordFqdns: [validationRecord.fqdn],
});
