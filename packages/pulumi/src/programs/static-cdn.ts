import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type { PulumiFn } from "@pulumi/pulumi/automation/index.js";

export interface StaticCdnProgramArgs {
  name: string;
}

/**
 * Deploy program: a private S3 bucket fronted by CloudFront (Origin Access Control). Built static
 * files are uploaded to the bucket by the build step; CloudFront (1 TB/mo free) serves them.
 */
export function staticCdnProgram(args: StaticCdnProgramArgs): PulumiFn {
  return async () => {
    const bucket = new aws.s3.BucketV2(args.name, { bucket: args.name });

    new aws.s3.BucketPublicAccessBlock(args.name, {
      bucket: bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });

    const oac = new aws.cloudfront.OriginAccessControl(args.name, {
      name: args.name,
      originAccessControlOriginType: "s3",
      signingBehavior: "always",
      signingProtocol: "sigv4",
    });

    const dist = new aws.cloudfront.Distribution(args.name, {
      enabled: true,
      defaultRootObject: "index.html",
      origins: [
        {
          originId: "s3",
          domainName: bucket.bucketRegionalDomainName,
          originAccessControlId: oac.id,
        },
      ],
      defaultCacheBehavior: {
        targetOriginId: "s3",
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD"],
        cachedMethods: ["GET", "HEAD"],
        forwardedValues: { queryString: false, cookies: { forward: "none" } },
      },
      restrictions: { geoRestriction: { restrictionType: "none" } },
      viewerCertificate: { cloudfrontDefaultCertificate: true },
    });

    // Allow the distribution to read from the bucket (OAC + bucket policy).
    new aws.s3.BucketPolicy(args.name, {
      bucket: bucket.id,
      policy: pulumi.all([bucket.arn, dist.arn]).apply(([bucketArn, distArn]) =>
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { Service: "cloudfront.amazonaws.com" },
              Action: "s3:GetObject",
              Resource: `${bucketArn}/*`,
              Condition: { StringEquals: { "AWS:SourceArn": distArn } },
            },
          ],
        }),
      ),
    });

    return { url: pulumi.interpolate`https://${dist.domainName}`, bucket: bucket.bucket };
  };
}
