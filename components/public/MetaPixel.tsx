/* eslint-disable @next/next/no-img-element -- Meta requires this noscript fallback. */
import Script from "next/script";

/**
 * Loads Meta's browser pixel only when a public Pixel ID is configured.
 * It sends PageView plus standard interaction events from the public UI.
 * Customer contact fields are never passed to Meta.
 */
export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;

  // This is a deployment-controlled public ID, but serialize it anyway so a
  // malformed environment value can never break out of the inline script.
  const serializedPixelId = JSON.stringify(pixelId);

  return (
    <>
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,
'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${serializedPixelId});
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
