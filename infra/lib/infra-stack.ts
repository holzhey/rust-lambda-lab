import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import path = require('path');
import { Distribution, OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "Bucket", {
      accessControl: s3.BucketAccessControl.PRIVATE
    });

    new BucketDeployment(this, "BucketDeployment", {
      destinationBucket: bucket,
      sources: [Source.asset(path.resolve(__dirname, "../../dist"))]
    }); 

    const originAccessIdentity = new OriginAccessIdentity(this, "OriginAccessIdentity");
    bucket.grantRead(originAccessIdentity);

    new Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: new S3Origin(bucket, {originAccessIdentity}),
      },
    });

    const ddb = new cdk.aws_dynamodb.Table(this, "rustdb",{
      partitionKey: {
        name: "id",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
    });

    const api = new apigateway.RestApi(this, "api", {
      restApiName: "rust-api",
      deployOptions: {
        stageName: "dev",
      },
    });
    const helloLambda = new lambda.Function(this, "rust-hello", {
      functionName: "hello-rust",
      code: lambda.Code.fromAsset(
        "../target/lambda/demo-1"
      ),
      runtime: lambda.Runtime.PROVIDED_AL2,
      handler: "not.required",
      environment: {
        RUST_BACKTRACE: "1",
        TABLE_NAME: ddb.tableName,
      },
      logRetention: RetentionDays.ONE_DAY,
    });
    const messages = api.root.addResource("messages");

    messages.addMethod(
      "GET",
      new apigateway.LambdaIntegration(helloLambda, { proxy: true })
    );
  }
}

