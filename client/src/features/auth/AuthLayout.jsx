function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>

      {footer && <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>}
    </main>
  );
}

export default AuthLayout;
