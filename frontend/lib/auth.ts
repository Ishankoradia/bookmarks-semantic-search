import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Parse whitelisted emails from environment variable
const getWhitelistedEmails = (): string[] => {
  const emails = process.env.WHITELISTED_EMAILS || "";
  return emails.split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if email is whitelisted
      const whitelistedEmails = getWhitelistedEmails();
      
      // If no whitelist is configured, allow all
      if (whitelistedEmails.length === 0) {
        console.warn("No WHITELISTED_EMAILS configured - allowing all users");
        return true;
      }
      
      // Check if user email is in whitelist
      if (user.email && whitelistedEmails.includes(user.email.toLowerCase())) {
        // Save or update user in backend
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/user`, {
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
            console.error('Failed to save user to backend');
            return false;
          }
          
          const userData = await response.json();
          // Store user UUID for later use
          user.id = userData.uuid;
          
        } catch (error) {
          console.error('Error saving user to backend:', error);
          return false;
        }
        
        return true;
      }
      
      // User not whitelisted
      return false;
    },
    async session({ session, token }) {
      // Add user UUID to session
      if (token.id) {
        session.user.id = token.id;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Persist the user UUID in the token
      if (user?.id) {
        token.sub = user.id; // NextAuth uses sub for user identifier
        token.id = user.id;  // Store UUID in custom field
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