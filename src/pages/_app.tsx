import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Navbar />
      <main className="pt-20"> {/* deja espacio para el navbar fijo */}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#fff",
              borderRadius: "10px",
              fontSize: "14px",
              padding: "10px 16px",
            },
          }}
        />
        <Component {...pageProps} />
      </main>
    </>
  );
}
