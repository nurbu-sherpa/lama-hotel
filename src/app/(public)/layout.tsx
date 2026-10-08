import { Header } from "@/components/public/Header";
import { Footer } from "@/components/public/Footer";
import { MobileCtaBar } from "@/components/public/MobileCtaBar";
import { LodgeLoader } from "@/components/public/LodgeLoader";
import { ScrollToTop } from "@/components/public/ScrollToTop";

// Pages render per request from cached, tag-invalidated data, so owner edits appear immediately
// and builds don't need a database connection.
export const dynamic = "force-dynamic";

// Splash plays once per browser session; repeat loads skip it before first paint.
const SPLASH_ONCE = `try{if(sessionStorage.getItem("lh-splash"))document.body.dataset.splash="off";else{sessionStorage.setItem("lh-splash","1");setTimeout(function(){document.body.dataset.splash="off"},5000)}}catch(e){}`;

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SPLASH_ONCE }} />
      <div className="splash" aria-hidden>
        <LodgeLoader className="h-20 w-20" />
        <p className="splash-name">Lama Hotel &amp; Lodge</p>
        <span className="splash-bar" />
      </div>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
      <MobileCtaBar />
      <ScrollToTop />
    </>
  );
}
