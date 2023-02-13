import NextAuth from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';

export default NextAuth({
  providers: [
    CognitoProvider({
      clientId: process.env['COGNITO_CLIENT_ID'] as string,
      clientSecret: process.env['COGNITO_CLIENT_SECRET'] as string,
      issuer: process.env['COGNITO_ISSUER'] as string,
      idToken: true,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account && account.id_token) {
        token.idToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.idToken) {
        session.user.idToken = token.idToken;
      }
      return session;
    },
  },
});
