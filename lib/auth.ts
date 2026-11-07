import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, verifyOtp } from "@/lib/otp";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "otp",
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null;

        const email = normalizeEmail(credentials.email);
        if (!(await verifyOtp(email, credentials.code))) return null;

        const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email } });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          clinicId: user.clinicId ?? undefined,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = (user as any).id;
      // Role and clinic change after sign-in (generating a site links the clinic),
      // so read them fresh instead of trusting what was true at login.
      if (token.uid) {
        const current = await prisma.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true, clinicId: true },
        });
        if (!current) return { ...token, uid: undefined, role: undefined, clinicId: undefined }; // account deleted: signed out
        token.role = current.role;
        token.clinicId = current.clinicId ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.uid) return { ...session, user: undefined } as any;
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role;
        (session.user as any).clinicId = token.clinicId;
      }
      return session;
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getServerAuthSession();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session.user as { id: string; role: "owner" | "admin"; clinicId?: string; email?: string };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}
