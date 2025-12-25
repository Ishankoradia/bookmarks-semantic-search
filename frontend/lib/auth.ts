import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Module augmentation for NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
    };
    accessToken?: string;
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string;
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    sub: string;
    accessToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Always try to login to backend - backend will handle whitelist checking
      try {
        const response = await fetch('http://backend:6005/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            picture: user.image,
            google_id: account?.providerAccountId,
          }),
        });
        
        if (!response.ok) {
          console.error('Backend login failed:', response.status, response.statusText);
          return false;
        }
        
        const loginData = await response.json();
        // Store user data and JWT token in NextAuth session
        user.id = loginData.user.uuid;
        user.email = loginData.user.email;
        user.name = loginData.user.name;
        user.accessToken = loginData.access_token;
        
        return true;
      } catch (error) {
        console.error('Error logging in to backend:', error);
        return false;
      }
    },
    async session({ session, token }) {
      // Add user data and JWT token to session
      if (token.id) {
        session.user.id = token.id;
      }
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Persist user data and JWT token
      if (user?.id) {
        token.sub = user.id;
        token.id = user.id;
        token.accessToken = user.accessToken;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};