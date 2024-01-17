import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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

