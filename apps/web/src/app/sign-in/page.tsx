import { AuthHeader } from "@/components/AuthHeader";
import { SignInForm } from "@/components/SignInForm";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <AuthHeader switchTo="register" />
      <main className="auth-main">
        <SignInForm next={next} />
      </main>
    </>
  );
}
