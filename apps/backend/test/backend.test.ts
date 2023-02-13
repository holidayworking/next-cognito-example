import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { BackendStack } from '../lib/backend-stack';

test('snapshot', () => {
  const app = new App();
  const stack = new BackendStack(app, 'BackendStack');
  const template = Template.fromStack(stack);
  expect(template).toMatchSnapshot();
});
