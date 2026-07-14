import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div id="login-screen">
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/logo-dark.png" alt="Selenior" className="login-brand" />
        <div className="login-tag">CS Dashboard</div>
        <h2>Bem-vindo</h2>
        <p>
          Entre com sua senha. Admin tem permissão de edição; visualização é
          somente leitura.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
