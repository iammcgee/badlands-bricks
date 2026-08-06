import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-black">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 md:px-8">
        <div className="flex items-center gap-6">
          <LogoMark />
          <a
            href="https://www.youtube.com"
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

function LogoMark() {
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white bg-white text-center">
      <div>
        <svg
          width="48"
          height="28"
          viewBox="0 0 64 36"
          fill="none"
          aria-hidden
          className="mx-auto"
        >
          <path
            d="M4 28 L16 10 L24 18 L34 6 L44 16 L52 8 L60 28 Z"
            fill="#111"
          />
          <circle cx="18" cy="8" r="2.2" fill="#ff5a00" />
          <circle cx="34" cy="4" r="2.2" fill="#ff5a00" />
          <circle cx="50" cy="6" r="2.2" fill="#ff5a00" />
        </svg>
        <p className="mt-0.5 font-display text-[8px] leading-none tracking-wider text-black">
          BADLANDS
          <br />
          BRICKS
        </p>
      </div>
    </div>
  );
}
