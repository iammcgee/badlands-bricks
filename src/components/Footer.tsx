import Link from "next/link";
import { LOGO_SRC, YOUTUBE_URL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-black">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Badlands Bricks home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_SRC}
              alt="Badlands Bricks"
              className="h-20 w-20 rounded-full object-contain"
            />
          </Link>
          <a
            href={YOUTUBE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="YouTube"
            className="flex h-10 w-10 items-center justify-center border border-white/30 text-white transition hover:border-brand-orange hover:text-brand-orange"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7L16 12l-6.2 3.5z" />
            </svg>
          </a>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-xs tracking-[0.14em] text-white/70">
          <Link href="/build" className="hover:text-brand-orange">
            BUILD
          </Link>
          <Link href="/submit-your-mocs" className="hover:text-brand-orange">
            SUBMIT YOUR MOCS
          </Link>
          <Link href="/contact-us" className="hover:text-brand-orange">
            CONTACT
          </Link>
        </div>
        <p className="text-center text-xs text-white/40">
          © {new Date().getFullYear()} Badlands Bricks. LEGO® is a trademark of
          the LEGO Group, which does not sponsor, authorize, or endorse this
          site.
        </p>
      </div>
    </footer>
  );
}
