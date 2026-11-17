import { AuthHeader } from "@/components/AuthHeader";
import { RegisterForm } from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <>
      <AuthHeader switchTo="sign-in" />
      <main className="auth-main">
        <RegisterForm />
      </main>
    </>
  );
}
