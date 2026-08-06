import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";

export const metadata = { title: "CONTACT" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center md:px-8">
      <h1 className="font-display text-5xl tracking-[0.1em] text-white md:text-6xl">
        CONTACT US
      </h1>
      <div className="mx-auto mt-8 max-w-2xl space-y-4 font-display text-lg tracking-[0.06em] text-white/85 md:text-xl">
        <p>
          HAVE A QUESTION ABOUT AN ORDER, NEED HELP WITH A DIGITAL BUILDING
          GUIDE, OR JUST WANT TO TALK BRICKS?
        </p>
        <p>WE&apos;RE HERE TO HELP.</p>
        <p>
          REACH OUT TO US ANYTIME AT:{" "}
          <a
            href="mailto:info@badlandsbricks.com"
            className="text-brand-orange underline"
          >
            INFO@BADLANDSBRICKS.COM
          </a>
        </p>
        <p className="text-base tracking-normal text-white/65">
          Looking to submit your own custom design instead? Head over to our{" "}
          <Link href="/submit-your-mocs" className="text-brand-orange underline">
            Submit Design Portal
          </Link>{" "}
          to share your MOC instructions with our builder community.
        </p>
      </div>
      <ContactForm />
    </div>
  );
}
