import path from 'path';

import { CorsHttpMethod, HttpApi, HttpMethod, HttpNoneAuthorizer } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpUserPoolAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { HttpAlbIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AccountRecovery, Mfa, OAuthScope, UserPool } from 'aws-cdk-lib/aws-cognito';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { ContainerImage, CpuArchitecture } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';

import type { Construct } from 'constructs';

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, 'CognitoUserPool', {
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      mfa: Mfa.REQUIRED,
      mfaSecondFactor: {
        otp: true,
        sms: false,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
    });

    const userPoolClient = userPool.addClient('CognitoUserPoolClient', {
      generateSecret: true,
      oAuth: {
        callbackUrls: ['http://localhost:3000/api/auth/callback/cognito'],
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE],
      },
    });

    userPool.addDomain('CognitoUserPoolDomain', {
      cognitoDomain: {
        domainPrefix: this.node.tryGetContext('cognitoUserPoolDomainPrefix') || 'next-example',
      },
    });

    const api = new ApplicationLoadBalancedFargateService(this, 'Api', {
      publicLoadBalancer: false,
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.ARM64,
      },
      taskImageOptions: {
        containerPort: 1323,
        image: ContainerImage.fromDockerImageAsset(
          new DockerImageAsset(this, 'ApiImage', {
            directory: path.join(__dirname, '../docker/api'),
            platform: Platform.LINUX_ARM64,
          })
        ),
      },
    });

    const httpUserPoolAuthorizer = new HttpUserPoolAuthorizer('ApiGatewayHttpUserPoolAuthorizer', userPool, {
      userPoolClients: [userPoolClient],
    });

    const httpAlbIntegration = new HttpAlbIntegration('ApiGatewayHttpAlbIntegration', api.listener);

    const httpApi = new HttpApi(this, 'ApiGatewayHttpApi', {
      corsPreflight: {
        allowHeaders: ['Authorization'],
        allowMethods: [CorsHttpMethod.GET],
        allowOrigins: ['http://localhost:3000'],
      },
      defaultAuthorizer: httpUserPoolAuthorizer,
      defaultIntegration: httpAlbIntegration,
    });

    httpApi.addRoutes({
      authorizer: new HttpNoneAuthorizer(),
      integration: httpAlbIntegration,
      methods: [HttpMethod.OPTIONS],
      path: '/{proxy+}',
    });

    new CfnOutput(this, 'CognitoClientId', {
      value: userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, 'CognitoClientSecret', {
      value: userPoolClient.userPoolClientSecret.unsafeUnwrap(),
    });

    new CfnOutput(this, 'CognitoIssuer', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
    });

    new CfnOutput(this, 'NextPublicBackendUrl', {
      value: httpApi.apiEndpoint,
    });
  }
}
