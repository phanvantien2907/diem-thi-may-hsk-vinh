import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { Toaster } from "~/components/ui/toast";
import { TooltipProvider } from "~/components/ui/tooltip";
import { NotFound } from "~/components/layout/NotFound";
import "./app.css";


export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>

    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />;
  }

  let title = "Đã xảy ra lỗi hệ thống";
  let description =
    "Hệ thống gặp sự cố không mong muốn. Vui lòng tải lại trang hoặc thử lại sau.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = `Lỗi ${error.status} - ${error.statusText || "Không thể xử lý yêu cầu"}`;
    description =
      typeof error.data === "string"
        ? error.data
        : error.data?.message || description;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    description = error.message;
    stack = error.stack;
  }

  return (
    <main className="relative flex min-h-dvh min-w-0 w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        <h1 className="text-2xl font-bold tracking-tight text-destructive sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            Quay lại trang chủ
          </a>
        </div>
        {stack && (
          <pre className="mt-6 max-h-60 w-full overflow-auto rounded-xl border border-border bg-muted/60 p-4 text-left text-xs font-mono text-muted-foreground">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
