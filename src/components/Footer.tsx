import Link from 'next/link';
import { Award } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-14">
      <div className="mx-auto max-w-content px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Logo and Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-text">
                <Award className="h-4 w-4 text-text-inverse" />
              </span>
              <span className="text-sm font-semibold text-text tracking-tight">
                ArgueMate
              </span>
            </Link>
            <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
              AI-powered debate coaching and sparring to sharpen your communication, logical reasoning, and persuasion skills.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-caption text-text-muted uppercase mb-4">Platform</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#features" className="text-sm text-text-secondary hover:text-text transition-colors duration-150">Features</a>
              </li>
              <li>
                <a href="#how-it-works" className="text-sm text-text-secondary hover:text-text transition-colors duration-150">How it Works</a>
              </li>
              <li>
                <Link href="/login" className="text-sm text-text-secondary hover:text-text transition-colors duration-150">Log In</Link>
              </li>
              <li>
                <Link href="/signup" className="text-sm text-text-secondary hover:text-text transition-colors duration-150">Sign Up</Link>
              </li>
            </ul>
          </div>

          {/* Contact / Social */}
          <div>
            <h4 className="text-caption text-text-muted uppercase mb-4">Connect</h4>
            <div className="flex gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-input border border-border bg-surface text-text-secondary hover:text-text hover:bg-surface-2 transition-colors duration-150"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-input border border-border bg-surface text-text-secondary hover:text-text hover:bg-surface-2 transition-colors duration-150"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-caption text-text-muted">
            &copy; {new Date().getFullYear()} ArgueMate AI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <span className="text-caption text-text-muted hover:text-text-secondary cursor-pointer">Privacy Policy</span>
            <span className="text-caption text-text-muted hover:text-text-secondary cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
